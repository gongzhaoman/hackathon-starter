import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AgentService } from '../agent/agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from '../tool/tools.service';

import { EventBus } from './event-bus';
import { Workflow } from './workflow';
import { StartEvent, StopEvent } from './workflow.types';
import { CreateWorkflowDto } from './workflow.controller';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly eventBus: EventBus,
    private readonly toolsService: ToolsService,
    private readonly agentService: AgentService,
    private readonly prismaService: PrismaService,
  ) {}

  async fromDsl(dsl: any, workflowId?: string): Promise<Workflow> {
    const workflow = new Workflow<any, any, any>(this.eventBus, {});

    const toolsRegistry = new Map<string, any>();
    for (const tool of dsl.tools ?? []) {
      if (typeof tool === 'string') {
        toolsRegistry.set(tool, await this.toolsService.getToolByName(tool));
      }
    }

    const agentsRegistry = new Map<string, any>();

    for (const agent of dsl.agents ?? []) {
      const prompt = `${agent.prompt}
永远按照下面的JSON结构生成内容，不要有其他无关的解释。
${JSON.stringify(agent.output, null, 2)}
      `;

      let persistentAgent: any;
      let tools = agent.tools || [];

      // 如果有 workflowId，尝试查找已存在的工作流智能体
      if (workflowId) {
        const existingWorkflowAgent = await this.prismaService.workflowAgent.findFirst({
          where: {
            workflowId: workflowId,
            agentName: agent.name,
          },
          include: {
            agent: true,
          },
        });

        if (existingWorkflowAgent) {
          persistentAgent = existingWorkflowAgent.agent;
          this.logger.log(`Found existing workflow agent: ${agent.name} (${persistentAgent.id})`);
        }
      }

      // 如果没有找到现有智能体，创建新的持久化智能体
      if (!persistentAgent) {
        persistentAgent = await this.prismaService.agent.create({
          data: {
            name: workflowId ? `${workflowId}_${agent.name}` : `workflow_${agent.name}_${Date.now()}`,
            description: agent.description || `工作流智能体: ${agent.name}`,
            prompt: agent.prompt,
            options: agent.output || {},
            createdById: 'workflow-system',
            isWorkflowGenerated: true,  // 标记为工作流生成的智能体
          },
        });

        this.logger.log(`Created new workflow agent: ${agent.name} (${persistentAgent.id})`);

        // 如果有 workflowId，创建工作流智能体关联
        if (workflowId) {
          await this.prismaService.workflowAgent.create({
            data: {
              workflowId: workflowId,
              agentId: persistentAgent.id,
              agentName: agent.name,
            },
          });
        }
      }

      // 处理知识库关联
      if (agent.knowledgeBases && agent.knowledgeBases.length > 0) {
        // 清理现有的知识库关联（如果是更新）
        await this.prismaService.agentKnowledgeBase.deleteMany({
          where: { agentId: persistentAgent.id },
        });

        // 重新链接知识库
        for (const kbId of agent.knowledgeBases) {
          try {
            await this.prismaService.agentKnowledgeBase.create({
              data: {
                agentId: persistentAgent.id,
                knowledgeBaseId: kbId,
              },
            });
          } catch (error) {
            this.logger.warn(`Failed to link knowledge base ${kbId} to agent ${persistentAgent.id}:`, error);
          }
        }

        // 确保知识库工具包存在
        const existingKbToolkit = await this.prismaService.agentToolkit.findFirst({
          where: {
            agentId: persistentAgent.id,
            toolkitId: 'knowledge-base-toolkit-01',
          },
        });

        if (!existingKbToolkit) {
          await this.prismaService.agentToolkit.create({
            data: {
              agentId: persistentAgent.id,
              toolkitId: 'knowledge-base-toolkit-01',
              settings: { agentId: persistentAgent.id },
            },
          });
        }

        // 获取知识库工具
        const kbTools = await this.toolsService.getAgentTools(persistentAgent.id);
        const kbToolNames = kbTools.map(tool => tool.name);
        tools = [...tools, ...kbToolNames];
      }

      // 处理工具包分配（如果 DSL 中定义了 toolkits）
      if (agent.toolkits && agent.toolkits.length > 0) {
        // 清理现有的工具包关联（除了知识库工具包）
        await this.prismaService.agentToolkit.deleteMany({
          where: { 
            agentId: persistentAgent.id,
            toolkitId: { not: 'knowledge-base-toolkit-01' }
          },
        });

        // 只分配业务工具包
        for (const toolkitId of agent.toolkits) {
          // 验证是否为业务工具包
          const toolkit = await this.prismaService.toolkit.findUnique({
            where: { id: toolkitId },
          });

          if (!toolkit) {
            this.logger.warn(`Toolkit ${toolkitId} not found`);
            continue;
          }

          if (toolkit.type === 'SYSTEM') {
            this.logger.warn(`Skipping system toolkit ${toolkitId} for execution agent ${persistentAgent.id}`);
            continue;
          }

          // 检查是否已存在（避免重复分配）
          const existing = await this.prismaService.agentToolkit.findFirst({
            where: {
              agentId: persistentAgent.id,
              toolkitId: toolkitId,
            },
          });

          if (!existing) {
            await this.prismaService.agentToolkit.create({
              data: {
                agentId: persistentAgent.id,
                toolkitId: toolkitId,
                settings: { agentId: persistentAgent.id },
              },
            });

            this.logger.log(`Assigned business toolkit ${toolkitId} to agent ${persistentAgent.id}`);
          }
        }
      }

      agentsRegistry.set(
        agent.name,
        await this.agentService.createAgentInstance(prompt, tools),
      );
    }

    function buildHandle(
      codeStr: string,
      toolNames: string[],
      agentNames: string[],
    ) {
      const params = ['event', 'context', ...toolNames, ...agentNames];
      return new Function(
        ...params,
        `return (${codeStr})(event, context, ${toolNames
          .concat(agentNames)
          .join(', ')});`,
      );
    }

    for (const step of dsl.steps ?? []) {
      const toolNames = Array.from(toolsRegistry.keys()).filter((name) =>
        step.handle.includes(name),
      );
      const agentNames = Array.from(agentsRegistry.keys()).filter((name) =>
        step.handle.includes(name),
      );

      const realHandle = buildHandle(step.handle, toolNames, agentNames);

      workflow.addStep({
        eventType: step.event,
        handle: async (event, context) => {
          const toolFns = toolNames.map((n) => toolsRegistry.get(n));
          const agentFns = agentNames.map((n) => agentsRegistry.get(n));
          return await realHandle(event, context, ...toolFns, ...agentFns);
        },
      });
    }

    return workflow;
  }

  async createDslGeneratorWorkflow(
    dslSchema: any,
    description: string,
    inputSchema?: Record<string, string>,
    outputSchema?: Record<string, string>,
  ): Promise<any> {
    const workflow = new Workflow<any, any, any>(this.eventBus, {});

    const tools = await this.prismaService.tool.findMany({
      where: {
        toolkitId: 'tool-explorer-toolkit-01',
      },
    });

    // 构建输入输出schema约束
    let schemaConstraints = '';
    if (inputSchema || outputSchema) {
      schemaConstraints = `

## 重要：数据结构约束

**此工作流必须严格按照以下数据结构设计：**
`;
      
      if (inputSchema) {
        schemaConstraints += `
### 输入数据结构（必须严格遵守）
工作流的WORKFLOW_START事件的data字段必须完全符合以下结构：
${JSON.stringify(inputSchema, null, 2)}
`;
      }
      
      if (outputSchema) {
        schemaConstraints += `
### 输出数据结构（必须严格遵守）
工作流的WORKFLOW_STOP事件的data字段必须完全符合以下结构：
${JSON.stringify(outputSchema, null, 2)}
`;
      }
      
      schemaConstraints += `
**关键约束：**
- 生成的DSL中的events数组必须包含与指定schema完全匹配的数据结构
- WORKFLOW_START事件的data字段必须与输入schema一致
- WORKFLOW_STOP事件的data字段必须与输出schema一致
- 不得添加、删除或修改schema中定义的字段名和类型
- 所有步骤的处理逻辑必须确保数据在输入输出之间正确转换
`;
    }

    const prompt = `你是一个专业的DSL(领域专用语言)工作流设计专家，专门负责将用户的自然语言需求转换为标准化的AI工作流编排DSL。

**当前任务：** 根据描述"${description}"设计工作流DSL。${schemaConstraints}

**重要：你必须只输出纯JSON格式的DSL，不要包含任何解释文字、markdown代码块标记或其他内容。直接输出符合DSL Schema规范的JSON对象。**

DSL Schema如下:
${JSON.stringify(dslSchema, null, 2)}

## 核心职责

1. **需求理解**：深入理解用户描述的业务流程和具体需求
2. **架构设计**：分析并设计所需的工具、智能体和事件流转逻辑
3. **DSL生成**：生成完全符合Schema规范的JSON配置文件
4. **质量保证**：确保生成的工作流逻辑正确、完整且可执行

## DSL Schema核心要求

### 必需字段规范
- **id**: 工作流唯一标识符，格式：字母开头，可包含字母数字下划线，长度1-100字符
- **name**: 工作流显示名称，长度1-200字符
- **description**: 功能描述，长度1-500字符
- **version**: 协议版本号，格式：v加数字和点号组合，默认"v1"
- **tools**: 工具名称数组，每个工具名必须以字母开头，可包含字母数字下划线，只能是系统中存在的tool
- **events**: 事件定义数组，最少2个，必须包含WORKFLOW_START和WORKFLOW_STOP
- **steps**: 步骤处理逻辑数组，每个步骤对应一个事件的处理函数，函数中只能使用你已经定义了的agent

### 可选字段规范
- **agents**: 智能体定义数组，包含name、description、prompt、output、tools、knowledgeBases字段
- **content**: 工作流上下文数据对象，可为空

### 关键约束条件
1. **工具存在性验证（最重要）**: 必须先调用 listAllTools 工具发现可用工具，只能使用返回列表中实际存在的工具，绝对禁止使用未找到或虚构的工具
2. **知识库发现验证**: 如果需要使用知识库，必须先调用 listAllKnowledgeBases 工具发现可用知识库，只能使用返回列表中实际存在的知识库
3. **智能体工具选择**: 为每个智能体选择合适的工具，根据智能体的功能需求从已验证存在的工具中选择相关工具，避免分配不相关的工具
4. **智能体知识库选择**: 为每个智能体选择合适的知识库，根据智能体的功能需求从已验证存在的知识库中选择相关知识库
5. **事件命名**: 必须使用大写字母和下划线格式，如TASK_COMPLETED、DATA_PROCESSED
6. **Handle函数**: 必须严格遵循格式 async (event, context) => { ... }
7. **工具引用**: 所有在agents或steps中使用的工具都必须在tools数组中声明，且必须是已验证存在的工具
8. **事件匹配**: 除WORKFLOW_STOP外，所有events中定义的事件都应在steps中有对应处理

### Handle函数中工具和智能体的调用方式（关键）

**工具调用方式：**
工具在 handle 函数中作为参数传递，调用方式如下：
# const toolResult = await toolName.call({ param1: value1, param2: value2 });

示例：
const timeResult = await getCurrentTime.call({ timezone: "Asia/Shanghai" });

**智能体调用方式：**
你可以在 handle 函数中通过如下方式调用某个智能体进行复杂处理：
# const response = await AgentName.run("智能体需要处理的内容");
# const resultString = response.data.result;

**关键：智能体运行的实际结果永远在 response.data.result 中，不是直接在 response 中！**
**关键：response.data.result 永远是 string 类型，即使 agent 的 output 定义了复杂结构，实际返回的 result 也是字符串！**
**关键：智能体的 run 方法直接传入字符串参数，不需要包装成对象！**
如果需要使用结构化数据，需要用 JSON.parse() 解析 result 字符串。

示例：
const response = await QuestionClassifier.run(customerQuestion);
const resultString = response.data.result; // 这是字符串类型的结果
const classification = JSON.parse(resultString); // 如果需要结构化数据，需要解析JSON

## 标准分析流程

### 第一步：需求深度解析

目标识别：
- 明确核心业务目标和预期结果
- 识别关键输入数据和输出格式
- 分析处理步骤和可能的分支逻辑

复杂度评估：
- 判断是否需要智能体参与
- 评估数据处理的复杂程度

### 第二步：工具映射与验证（关键步骤）

**重要约束：只能使用系统中实际存在的工具，绝对不能使用未找到的工具！**

工具和知识库发现流程：
1. **必须先调用 listAllTools 工具**：获取系统中所有可用业务工具的完整列表（不包含查询工具本身）
2. **如需知识库，调用 listAllKnowledgeBases 工具**：获取系统中所有可用知识库的完整列表
3. **详细了解工具功能**：对于可能需要的工具，调用 checkToolDetail 工具获取具体信息
4. **详细了解知识库功能**：对于可能需要的知识库，调用 checkKnowledgeBaseDetail 工具获取具体信息
5. **严格验证存在性**：只能在DSL中使用通过相应工具确认存在的工具和知识库

工具选择原则：
- 仅从已发现的工具列表中选择
- 根据需求匹配最合适的工具组合
- 如果需要的功能没有对应工具，考虑使用智能体或调整工作流设计
- 绝对禁止臆测或虚构工具名称

正确的工具发现示例：
第一步：调用 listAllTools 工具获取所有可用的业务工具
返回结果示例：[{"name": "getCurrentTime", "description": "获取当前时间"}]

第二步：如需了解工具详情，调用 checkToolDetail 工具并传入工具名称
返回结果示例：{"name": "getCurrentTime", "description": "获取当前时间", "parameters": {...}}

第三步：在DSL中只使用第一步返回列表中的工具名称

### 第三步：事件流设计

事件识别：
- 必需事件：WORKFLOW_START（工作流启动）
- 必需事件：WORKFLOW_STOP（工作流结束）
- 业务事件：只在确实需要分支处理或状态保存时才创建，如DATA_PROCESSED、TASK_COMPLETED

事件设计原则：
- 在需要条件分支、并行处理或状态保存时应该创建中间事件
- 每个智能体调用尽可能创建单独的事件
- 简单的线性流程应该直接从 WORKFLOW_START 到 WORKFLOW_STOP

数据结构设计：
- 为每个事件定义data字段的具体结构
- 确保数据类型符合规范：string、number、boolean、object、array
- 保证事件间数据传递的连贯性

### 第四步：智能体设计（按需）

创建条件：
- 需要复杂的AI推理或决策
- 需要特定领域的专业知识处理
- 需要结构化的输出格式

设计要素：
- name: 智能体唯一标识符
- description: 功能描述（1-300字符）
- prompt: 系统提示词（1-2000字符），详细说明任务和期望
- output: 结构化输出格式（符合OpenAI结构化输出要求的JSON Schema）
- tools: **关键！为智能体选择合适的工具**
  * 必须从已通过 listAllTools 工具验证存在的工具列表中选择
  * 根据智能体的具体功能需求选择相关工具
  * 例如：时间查询智能体需要 getCurrentTime 工具，文件处理智能体需要文件操作工具
  * 不要为智能体分配不相关的工具
- knowledgeBases: **可选！为智能体选择合适的知识库**
  * 必须从已通过 listAllKnowledgeBases 工具验证存在的知识库列表中选择
  * 根据智能体的具体功能需求选择相关知识库
  * 例如：客服智能体需要产品知识库，法务智能体需要法律条文知识库
  * 只有需要查询特定领域知识时才分配知识库

### 第五步：步骤编排与实现

**优先考虑简单直接的处理流程**

处理函数编写：
- 严格遵循 async (event, context) => { ... } 格式
- 尽量在单个步骤中完成完整的业务逻辑
- 优先使用直接的 WORKFLOW_START → WORKFLOW_STOP 流程
- 只在必要时创建中间步骤和事件
- **调用智能体时必须使用 response.data.result 获取实际结果，result 永远是 string 类型**
- 添加必要的错误处理和异常捕获
- 确保返回值格式正确

逻辑验证：
- 检查事件流转的完整性
- 验证数据传递的正确性
- 确保所有分支都有适当处理
- 测试异常情况的处理逻辑

## 实现细节指南

### Handle函数最佳实践

标准格式模板：
// async (event, context) => {
//   // 1. 从事件中读取数据
//   const { userMessage } = event.data;
//
//   // 2. 从上下文读取变量（可选）
//   const session = context.session || {};
//
//   // 3. 调用工具（工具作为参数传递）
//   const timeResult = await getCurrentTime.call({ timezone: "Asia/Shanghai" });
//
//   // 4. 调用智能体处理数据
//   const response = await ChatAgent.run(userMessage);
//   const resultString = response.data.result;
//   const parsedResult = JSON.parse(resultString);
//
//   return {
//     type: 'NEXT_EVENT',
//     data: {
//       processedData: parsedResult,
//       currentTime: timeResult
//     }
//   };
// }

现在，请根据用户的具体工作流需求，生成一个完整、规范、可执行的AI工作流编排DSL。

输出要求：
1. **只能使用返回列表中已验证存在的工具和知识库**
2. **为智能体选择合适的工具，根据功能需求匹配相关工具**
3. **为智能体选择合适的知识库，根据功能需求匹配相关知识库**
4. **调用智能体时必须使用 response.data.result 获取实际结果，result 永远是 string 类型，如需结构化数据请使用 JSON.parse()**
5. 只输出纯JSON格式，不要包含任何解释
6. 不要使用markdown代码块
7. 确保JSON格式正确，可以被JSON.parse()解析
8. 直接以{开始，以}结束

示例输出格式：
{
  "id": "exampleWorkflow",
  "name": "示例工作流",
  "description": "这是一个示例",
  "version": "v1",
  "tools": ["getCurrentTime"],
  "agents": [
    {
      "name": "DataProcessor",
      "description": "处理输入数据并获取当前时间",
      "prompt": "你是数据处理专家，请分析输入数据并获取当前时间进行时间戳标记",
      "output": {"result": "string", "timestamp": "string"},
      "tools": ["getCurrentTime"]
    }
  ],
  "content": {},
  "events": [
    {"type": "WORKFLOW_START", "data": {"input": "string"}},
    {"type": "WORKFLOW_STOP", "data": {"output": "string"}}
  ],
  "steps": [
    {"event": "WORKFLOW_START", "handle": "async (event, context) => { const response = await DataProcessor.run(event.data.input); const resultString = response.data.result; const parsedResult = JSON.parse(resultString); return {type: 'WORKFLOW_STOP', data: {output: parsedResult.result, timestamp: parsedResult.timestamp}}; }"}
  ]
}`;

    const agent = await this.agentService.createAgentInstance(
      prompt,
      tools.map((tool) => tool.name),
    );

    workflow.addStep({
      eventType: StartEvent.type,
      handle: async (event, context) => {
        const reply = await agent.run(event.data.description);

        try {
          // 尝试不同的数据路径

          const dslText: string = reply.data.result;
          this.logger.debug('Attempting to parse DSL text:', dslText); // 调试信息

          // 清理可能的markdown代码块
          const cleanedText = dslText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

          const dsl = JSON.parse(cleanedText);

          // 验证DSL
          this.validateDsl(dsl);
          
          // 如果有输入输出schema约束，额外验证数据结构
          if (inputSchema || outputSchema) {
            this.validateSchemaCompliance(dsl, inputSchema, outputSchema);
          }

          return new StopEvent({
            data: dsl,
          });
        } catch (error) {
          this.logger.error('DSL generation failed:', error);
          this.logger.error('Agent reply was:', JSON.stringify(reply, null, 2));
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(
            `生成DSL失败: ${errorMessage}。智能体返回: ${JSON.stringify(reply, null, 2)}`,
          );
        }
      },
    });

    return workflow;
  }

  async createWorkflow(createWorkflowDto: CreateWorkflowDto) {
    // 验证 DSL 格式
    this.validateDsl(createWorkflowDto.dsl);

    // 保存到数据库
    const workflow = await this.prismaService.workFlow.create({
      data: {
        name: createWorkflowDto.name,
        description: createWorkflowDto.description || '',
        DSL: createWorkflowDto.dsl,
      },
    });

    return workflow;
  }

  async getAllWorkflows() {
    return this.prismaService.workFlow.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllWorkflowsPaginated(params: {
    page: number;
    pageSize: number;
    skip: number;
    search?: string;
  }) {
    const baseWhere = { deleted: false };

    // 添加搜索条件
    const where = params.search
      ? {
          ...baseWhere,
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { description: { contains: params.search, mode: 'insensitive' as const } }
          ]
        }
      : baseWhere;

    // 并行执行查询和计数
    const [data, total] = await Promise.all([
      this.prismaService.workFlow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.pageSize,
      }),
      this.prismaService.workFlow.count({ where })
    ]);

    return { data, total };
  }

  async getWorkflow(id: string) {
    const workflow = await this.prismaService.workFlow.findUnique({
      where: { id, deleted: false },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${id} not found`);
    }

    return workflow;
  }

  async executeWorkflow(id: string, input: any, context: any = {}) {
    // 获取工作流
    const workflowRecord = await this.getWorkflow(id);

    // 从 DSL 创建工作流实例，传入工作流 ID 以支持智能体持久化
    const workflow = await this.fromDsl(workflowRecord.DSL, id);

    // 执行工作流
    const result = await workflow.execute(input);

    return {
      workflowId: id,
      input,
      output: result,
      executedAt: new Date().toISOString(),
    };
  }

  // 获取工作流关联的智能体
  async getWorkflowAgents(workflowId: string) {
    return this.prismaService.workflowAgent.findMany({
      where: { workflowId },
      include: {
        agent: {
          include: {
            agentKnowledgeBases: {
              include: {
                knowledgeBase: true,
              },
            },
            agentToolkits: {
              include: {
                toolkit: true,
              },
            },
          },
        },
      },
    });
  }

  // 删除工作流时清理关联的智能体
  async deleteWorkflowAgents(workflowId: string) {
    const workflowAgents = await this.prismaService.workflowAgent.findMany({
      where: { workflowId },
      include: { agent: true },
    });

    // 删除智能体记录
    for (const workflowAgent of workflowAgents) {
      await this.prismaService.agent.delete({
        where: { id: workflowAgent.agentId },
      });
    }

    // 删除工作流智能体关联记录
    await this.prismaService.workflowAgent.deleteMany({
      where: { workflowId },
    });
  }

  // 更新工作流智能体并同步 DSL
  async updateWorkflowAgent(workflowId: string, agentName: string, agentData: any) {
    // 获取工作流智能体
    const workflowAgent = await this.prismaService.workflowAgent.findFirst({
      where: { workflowId, agentName },
      include: { agent: true },
    });

    if (!workflowAgent) {
      throw new Error(`Workflow agent ${agentName} not found`);
    }

    // 更新智能体
    const updatedAgent = await this.prismaService.agent.update({
      where: { id: workflowAgent.agentId },
      data: {
        prompt: agentData.prompt,
        description: agentData.description,
        options: agentData.options,
        updatedAt: new Date(),
      },
    });

    // 不再同步更新 DSL，保持 DSL 稳定
    return updatedAgent;
  }



  async deleteWorkflow(id: string) {
    // 验证工作流存在
    await this.getWorkflow(id);

    return this.prismaService.workFlow.update({
      where: { id },
      data: { deleted: true },
    });
  }

  private validateDsl(dsl: any) {
    // 基本验证
    if (!dsl || typeof dsl !== 'object') {
      throw new Error('DSL must be a valid object');
    }

    const requiredFields = ['id', 'name', 'description', 'version', 'tools', 'events', 'steps'];
    for (const field of requiredFields) {
      if (!dsl[field]) {
        throw new Error(`DSL missing required field: ${field}`);
      }
    }

    // 验证事件
    if (!Array.isArray(dsl.events) || dsl.events.length < 2) {
      throw new Error('DSL must have at least 2 events');
    }

    const hasStart = dsl.events.some((e: any) => e.type === 'WORKFLOW_START');
    const hasStop = dsl.events.some((e: any) => e.type === 'WORKFLOW_STOP');

    if (!hasStart) {
      throw new Error('DSL must have WORKFLOW_START event');
    }

    if (!hasStop) {
      throw new Error('DSL must have WORKFLOW_STOP event');
    }

    // 验证步骤
    if (!Array.isArray(dsl.steps) || dsl.steps.length === 0) {
      throw new Error('DSL must have at least 1 step');
    }

    return true;
  }

  private validateSchemaCompliance(
    dsl: any,
    inputSchema?: Record<string, string>,
    outputSchema?: Record<string, string>,
  ) {
    const startEvent = dsl.events.find((e: any) => e.type === 'WORKFLOW_START');
    const stopEvent = dsl.events.find((e: any) => e.type === 'WORKFLOW_STOP');

    if (inputSchema && startEvent) {
      const startData = startEvent.data || {};
      for (const [key, type] of Object.entries(inputSchema)) {
        if (!startData.hasOwnProperty(key)) {
          throw new Error(`WORKFLOW_START event missing required field: ${key}`);
        }
        if (startData[key] !== type) {
          throw new Error(`WORKFLOW_START event field ${key} type mismatch: expected ${type}, got ${startData[key]}`);
        }
      }
    }

    if (outputSchema && stopEvent) {
      const stopData = stopEvent.data || {};
      for (const [key, type] of Object.entries(outputSchema)) {
        if (!stopData.hasOwnProperty(key)) {
          throw new Error(`WORKFLOW_STOP event missing required field: ${key}`);
        }
        if (stopData[key] !== type) {
          throw new Error(`WORKFLOW_STOP event field ${key} type mismatch: expected ${type}, got ${stopData[key]}`);
        }
      }
    }
  }
}
