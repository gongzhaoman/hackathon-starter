import { Injectable, NotFoundException } from '@nestjs/common';

import { ToolsService } from '../tool/tools.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';
import { LlamaindexService } from '../llamaindex/llamaindex.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llamaIndexService: LlamaindexService,
    private readonly toolsService: ToolsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  async findAll(userId: string, organizationId: string | undefined) {
    return this.prisma.agent.findMany({
      where: {
        deleted: false,
        isWorkflowGenerated: false,  // 只返回用户创建的智能体，隐藏工作流生成的智能体
        createdById: userId,
        ...(organizationId && { organizationId }),
      },
      include: {
        agentToolkits: {
          include: {
            toolkit: {
              include: {
                tools: true,
              },
            },
          },
        },
        agentKnowledgeBases: {
          include: {
            knowledgeBase: true,
          },
        },
      },
    });
  }

  async findAllPaginated(
    userId: string,
    organizationId: string | undefined,
    params: {
      page: number;
      pageSize: number;
      skip: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      search?: string;
    }
  ) {
    const baseWhere = {
      deleted: false,
      isWorkflowGenerated: false,
      createdById: userId,
      ...(organizationId && { organizationId }),
    };

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

    // 构建排序条件
    const orderBy = params.sortBy
      ? { [params.sortBy]: params.sortOrder || 'desc' }
      : { createdAt: 'desc' as const };

    const include = {
      agentToolkits: {
        include: {
          toolkit: {
            include: {
              tools: true,
            },
          },
        },
      },
      agentKnowledgeBases: {
        include: {
          knowledgeBase: true,
        },
      },
    };

    // 并行执行查询和计数
    const [data, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        include,
        orderBy,
        skip: params.skip,
        take: params.pageSize,
      }),
      this.prisma.agent.count({ where })
    ]);

    return { data, total };
  }

  async findOneAgent(userId: string, organizationId: string | undefined, agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: {
        id: agentId,
        deleted: false,
        createdById: userId,
        ...(organizationId && { organizationId }),
      },
      include: {
        agentTools: {
          include: {
            tool: true,
          },
        },
        agentToolkits: {
          include: {
            toolkit: {
              include: {
                tools: true,
              },
            },
          },
        },
        agentKnowledgeBases: {
          include: {
            knowledgeBase: true,
          },
        },
        createdBy: true,
        organization: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    return agent;
  }

  async createAgent(userId: string, organizationId: string | undefined, createAgentDto: CreateAgentDto) {
    // 创建智能体
    const agent = await this.prisma.agent.create({
      data: {
        name: createAgentDto.name,
        description: createAgentDto.description,
        prompt: createAgentDto.prompt,
        options: createAgentDto.options,
        createdById: userId,
        organizationId: organizationId || 'default-org-id',
      },
    });

    // 处理工具包分配
    await this.assignToolkitsToAgent(agent.id, createAgentDto);

    // 处理知识库分配
    await this.assignKnowledgeBasesToAgent(agent.id, createAgentDto);

    return agent;
  }

  private async assignToolkitsToAgent(agentId: string, dto: CreateAgentDto | UpdateAgentDto) {
    const commonToolkitId = 'common-toolkit-01';
    const toolkitConfigs: Array<{ toolkitId: string; settings: any }> = [];

    // 如果提供了工具包配置
    if (dto.toolkits && dto.toolkits.length > 0) {
      toolkitConfigs.push(...dto.toolkits.map(tk => ({
        toolkitId: tk.toolkitId,
        settings: tk.settings || {},
      })));
    }

    // 确保 common toolkit 总是被包含
    const hasCommonToolkit = toolkitConfigs.some(tk => tk.toolkitId === commonToolkitId);
    if (!hasCommonToolkit) {
      toolkitConfigs.unshift({
        toolkitId: commonToolkitId,
        settings: {},
      });
    }

    // 为智能体分配工具包
    for (const config of toolkitConfigs) {
      try {
        // 先检查工具包是否存在
        const toolkit = await this.prisma.toolkit.findUnique({
          where: { id: config.toolkitId },
        });

        if (toolkit) {
          // 自动在 settings 中添加 agentId，确保每个 toolkit 实例都知道自己归属的 agent
          const enhancedSettings = {
            ...config.settings,
            agentId: agentId, // 自动设置 agentId
          };

          await this.prisma.agentToolkit.create({
            data: {
              agentId: agentId,
              toolkitId: config.toolkitId,
              settings: enhancedSettings,
            },
          });
        } else {
          console.warn(`Warning: Toolkit ${config.toolkitId} not found, skipping...`);
        }
      } catch (error) {
        console.error(`Error assigning toolkit ${config.toolkitId} to agent:`, error);
      }
    }
  }

  private async assignKnowledgeBasesToAgent(agentId: string, dto: CreateAgentDto | UpdateAgentDto) {
    // 如果提供了知识库配置
    if (dto.knowledgeBases && dto.knowledgeBases.length > 0) {
      for (const kbId of dto.knowledgeBases) {
        try {
          // 先检查知识库是否存在
          const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
            where: { id: kbId },
          });

          if (knowledgeBase) {
            await this.prisma.agentKnowledgeBase.create({
              data: {
                agentId: agentId,
                knowledgeBaseId: kbId,
              },
            });
          } else {
            console.warn(`Warning: Knowledge base ${kbId} not found, skipping...`);
          }
        } catch (error) {
          console.error(`Error assigning knowledge base ${kbId} to agent:`, error);
        }
      }
    }
  }

  async updateAgent(userId: string, organizationId: string | undefined, agentId: string, updateAgentDto: UpdateAgentDto) {
    await this.findOneAgent(userId, organizationId, agentId);

    // 更新智能体基本信息
    const agent = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        name: updateAgentDto.name,
        description: updateAgentDto.description,
        prompt: updateAgentDto.prompt,
        options: updateAgentDto.options,
      },
    });

    // 如果提供了工具包配置，则更新工具包分配
    if (updateAgentDto.toolkits) {
      // 先删除现有的工具包分配
      await this.prisma.agentToolkit.deleteMany({
        where: { agentId: agentId },
      });

      // 重新分配工具包
      await this.assignToolkitsToAgent(agentId, updateAgentDto);
    }

    return agent;
  }

  async removeAgent(userId: string, organizationId: string | undefined, agentId: string) {
    await this.findOneAgent(userId, organizationId, agentId);

    return this.prisma.agent.update({
      where: { id: agentId },
      data: { deleted: true },
    });
  }

  async createAgentInstance(prompt: string, tools: string[], options?: any) {
    const toolsInstances = await Promise.all(
      tools.map(async (tool) => {
        const toolInstance = await this.toolsService.getToolByName(tool);
        return toolInstance;
      }),
    );
    const agent = await this.llamaIndexService.createAgent(
      toolsInstances,
      prompt,
    );

    return agent;
  }

  async chatWithAgent(userId: string, organizationId: string | undefined, agentId: string, chatDto: ChatWithAgentDto) {
    // 获取智能体信息
    const agent = await this.findOneAgent(userId, organizationId, agentId);

    // 获取智能体的工具
    const tools = await this.toolsService.getAgentTools(agentId);

    // 生成增强的系统提示词（包含知识库信息）
    const enhancedPrompt = await this.generateEnhancedPrompt(agentId, agent.prompt);

    // 创建智能体实例
    const agentInstance = await this.llamaIndexService.createAgent(
      tools,
      enhancedPrompt,
    );

    // 执行对话
    const response = await agentInstance.run(chatDto.message);

    return {
      agentId,
      agentName: agent.name,
      userMessage: chatDto.message,
      response: response.data.result,
      timestamp: new Date().toISOString(),
      context: chatDto.context || {},
    };
  }

  async getAgentToolkits(userId: string, organizationId: string | undefined, agentId: string) {
    await this.findOneAgent(userId, organizationId, agentId); // 验证智能体存在

    return this.prisma.agentToolkit.findMany({
      where: { agentId },
      include: {
        toolkit: {
          include: {
            tools: true,
          },
        },
      },
    });
  }

  // 生成智能体的知识库摘要信息，用于注入系统提示词
  private async generateKnowledgeBaseSummary(agentId: string): Promise<string> {
    try {
      const knowledgeBases = await this.knowledgeBaseService.getAgentKnowledgeBasesForAI(agentId);

      if (knowledgeBases.length === 0) {
        return '';
      }

      let summary = '\n\n## 📚 可用知识库信息\n\n';
      summary += `你可以访问以下 ${knowledgeBases.length} 个知识库，使用 queryKnowledgeBase 工具进行查询：\n\n`;

      knowledgeBases.forEach((kb: any, index: number) => {
        summary += `### ${index + 1}. ${kb.name}\n`;
        summary += `- **ID**: ${kb.id}\n`;
        summary += `- **描述**: ${kb.description || '暂无描述'}\n`;

        // 添加元数据schema信息
        const schemaFields = Object.keys(kb.metadataSchema || {});
        if (schemaFields.length > 0) {
          summary += `- **可过滤字段**: ${schemaFields.join(', ')}\n`;

          // 添加具体的元数据字段说明
          summary += `- **元数据字段详情**:\n`;
          schemaFields.forEach(field => {
            const fieldDef = kb.metadataSchema[field];
            summary += `  - \`${field}\` (${fieldDef.type}): ${fieldDef.description}\n`;
          });

          // 添加过滤示例
          if (kb.filterExamples && kb.filterExamples.length > 0) {
            summary += `- **过滤示例**:\n`;
            kb.filterExamples.slice(0, 2).forEach((example: any) => {
              summary += `  - ${example.description}: \`${JSON.stringify(example.filter)}\`\n`;
            });
          }
        } else {
          summary += `- **元数据**: 无特定元数据字段\n`;
        }
        summary += '\n';
      });

      summary += '💡 **使用建议**:\n';
      summary += '- 直接使用知识库ID调用 queryKnowledgeBase 工具\n';
      summary += '- 根据用户需求选择合适的元数据过滤条件\n';
      summary += '- 结合多个知识库的信息提供综合回答\n';

      return summary;
    } catch (error) {
      console.warn('Failed to generate knowledge base summary:', error);
      return '';
    }
  }

  // 生成增强的系统提示词，包含知识库信息
  private async generateEnhancedPrompt(agentId: string, originalPrompt: string): Promise<string> {
    const knowledgeBaseSummary = await this.generateKnowledgeBaseSummary(agentId);

    if (!knowledgeBaseSummary) {
      return originalPrompt;
    }

    return `${originalPrompt}${knowledgeBaseSummary}`;
  }

  // 处理消息的方法，用于定时任务和对话服务
  async processMessage(userId: string, organizationId: string | undefined, agentId: string, messages: Array<{ role: string; content: string }>) {
    // 获取智能体信息
    const agent = await this.findOneAgent(userId, organizationId, agentId);

    // 获取智能体的工具
    const tools = await this.toolsService.getAgentTools(agentId);

    // 生成增强的系统提示词（包含知识库信息）
    const enhancedPrompt = await this.generateEnhancedPrompt(agentId, agent.prompt);

    // 创建智能体实例
    const agentInstance = await this.llamaIndexService.createAgent(
      tools,
      enhancedPrompt,
    );

    // 获取最后一条用户消息
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';

    try {
      // 执行对话
      const response = await agentInstance.run(lastUserMessage);

      return {
        content: response.data.result,
        toolCalls: response.data.toolCalls || [],
        usage: response.data.usage || {},
      };
    } catch (error: any) {
      console.error('Error processing message:', error);
      throw new Error(`处理消息失败: ${error.message || error}`);
    }
  }

}
