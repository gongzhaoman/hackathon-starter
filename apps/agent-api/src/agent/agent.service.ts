import { Injectable, NotFoundException } from '@nestjs/common';

import { ToolsService } from '../tool/tools.service';

import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';
import { LlamaindexService } from '../llamaindex/llamaindex.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llamaIndexService: LlamaindexService,
    private readonly toolsService: ToolsService,
  ) {}

  async findAll() {
    return this.prisma.agent.findMany({
      where: { deleted: false },
    });
  }

  async findOne(id: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id, deleted: false },
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
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  async create(createAgentDto: CreateAgentDto) {
    // 创建智能体
    const agent = await this.prisma.agent.create({
      data: {
        name: createAgentDto.name,
        description: createAgentDto.description,
        prompt: createAgentDto.prompt,
        options: createAgentDto.options,
      },
    });

    // 处理工具包分配
    await this.assignToolkitsToAgent(agent.id, createAgentDto);

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
          await this.prisma.agentToolkit.create({
            data: {
              agentId: agentId,
              toolkitId: config.toolkitId,
              settings: config.settings,
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

  async update(id: string, updateAgentDto: UpdateAgentDto) {
    await this.findOne(id);

    // 更新智能体基本信息
    const agent = await this.prisma.agent.update({
      where: { id },
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
        where: { agentId: id },
      });

      // 重新分配工具包
      await this.assignToolkitsToAgent(id, updateAgentDto);
    }

    return agent;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.agent.update({
      where: { id },
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

  async chatWithAgent(agentId: string, chatDto: ChatWithAgentDto) {
    // 获取智能体信息
    const agent = await this.findOne(agentId);

    // 获取智能体的工具
    const tools = await this.toolsService.getAgentTools(agentId);

    // 创建智能体实例
    const agentInstance = await this.llamaIndexService.createAgent(
      tools,
      agent.prompt,
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

  async getAgentToolkits(agentId: string) {
    await this.findOne(agentId); // 验证智能体存在

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

}
