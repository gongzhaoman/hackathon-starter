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

  async fromDsl(dsl: any): Promise<Workflow> {
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
      agentsRegistry.set(
        agent.name,
        await this.agentService.createAgentInstance(prompt, agent.tools),
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

  async getCreateDSLWorkflow(
    dslSchema: any,
    userMessage: string,
  ): Promise<any> {
    const workflow = new Workflow<any, any, any>(this.eventBus, {});

    const tools = await this.prismaService.tool.findMany({
      where: {
        toolkitId: 'tool-explorer-toolkit-01',
      },
    });

    const prompt = `你是一个专业的DSL(领域专用语言)工作流设计专家，专门负责将用户的自然语言需求转换为标准化的AI工作流编排DSL。

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
- **agents**: 智能体定义数组，包含name、description、prompt、output、tools字段
- **content**: 工作流上下文数据对象，可为空

### 关键约束条件
1. **工具存在性验证（最重要）**: 必须先调用 listAllTools 工具发现可用工具，只能使用返回列表中实际存在的工具，绝对禁止使用未找到或虚构的工具
2. **事件命名**: 必须使用大写字母和下划线格式，如TASK_COMPLETED、DATA_PROCESSED
3. **Handle函数**: 必须严格遵循格式 async (event, context) => { ... }
4. **工具引用**: 所有在agents或steps中使用的工具都必须在tools数组中声明，且必须是已验证存在的工具
5. **事件匹配**: 除WORKFLOW_STOP外，所有events中定义的事件都应在steps中有对应处理

### Handle函数中智能体的调用方式（关键）
你可以在 handle 函数中通过如下方式调用某个智能体进行复杂处理：
# const reply = await AgentName.run("智能体需要处理的内容");
reply的结构是agent的output字段定义的结构。

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

工具发现流程：
1. **必须先调用 listAllTools 工具**：获取系统中所有可用业务工具的完整列表（不包含查询工具本身）
2. **详细了解工具功能**：对于可能需要的工具，调用 checkToolDetail 工具获取具体信息
3. **严格验证工具存在性**：只能在DSL中使用通过 listAllTools 确认存在的业务工具

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
- tools: 该智能体可使用的工具列表（必须是已通过函数调用验证存在的工具）

### 第五步：步骤编排与实现

**优先考虑简单直接的处理流程**

处理函数编写：
- 严格遵循 async (event, context) => { ... } 格式
- 尽量在单个步骤中完成完整的业务逻辑
- 优先使用直接的 WORKFLOW_START → WORKFLOW_STOP 流程
- 只在必要时创建中间步骤和事件
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
//   // 3. 调用工具或智能体处理数据
//   const reply = await ChatAgent.run(userMessage);
//   const analysis = await SomeTool({
//     input: userMessage,
//     metadata: session
//   });
//
//   context.lastReply = reply.text;
//   context.analysisResult = analysis;
//
//   return {
//     type: 'NEXT_EVENT',
//     data: {
//       processedData: analysis,
//     }
//   };
// }

现在，请根据用户的具体工作流需求，生成一个完整、规范、可执行的AI工作流编排DSL。

输出要求：
1. **只能使用返回列表中已验证存在的工具**
2. 只输出纯JSON格式，不要包含任何解释
3. 不要使用markdown代码块
4. 确保JSON格式正确，可以被JSON.parse()解析
5. 直接以{开始，以}结束

示例输出格式：
{
  "id": "exampleWorkflow",
  "name": "示例工作流",
  "description": "这是一个示例",
  "version": "v1",
  "tools": ["getCurrentTime"],
  "content": {},
  "events": [
    {"type": "WORKFLOW_START", "data": {"input": "string"}},
    {"type": "WORKFLOW_STOP", "data": {"output": "string"}}
  ],
  "steps": [
    {"event": "WORKFLOW_START", "handle": "async (event, context) => { const result = await getCurrentTime(); return {type: 'WORKFLOW_STOP', data: {output: result}}; }"}
  ]
}`;

    const agent = await this.agentService.createAgentInstance(
      prompt,
      tools.map((tool) => tool.name),
    );

    workflow.addStep({
      eventType: StartEvent.type,
      handle: async (event, context) => {
        const reply = await agent.run(event.data.userMessage);
        this.logger.debug('Agent reply:', JSON.stringify(reply, null, 2));

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
        agentToolId: '', // 这个字段可能需要调整，根据你的数据模型
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

    // 从 DSL 创建工作流实例，传入初始上下文
    const workflow = await this.fromDsl(workflowRecord.DSL);

    // 执行工作流
    const result = await workflow.execute(input);

    return {
      workflowId: id,
      input,
      output: result,
      executedAt: new Date().toISOString(),
    };
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
}
