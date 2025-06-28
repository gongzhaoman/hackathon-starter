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

    // 准备工具包ID列表，默认包含 common toolkit
    const toolkitIds = createAgentDto.toolkitIds || [];
    const commonToolkitId = 'common-toolkit-01';

    // 确保 common toolkit 总是被包含
    if (!toolkitIds.includes(commonToolkitId)) {
      toolkitIds.unshift(commonToolkitId);
    }

    // 为智能体分配工具包
    for (const toolkitId of toolkitIds) {
      try {
        // 先检查工具包是否存在
        const toolkit = await this.prisma.toolkit.findUnique({
          where: { id: toolkitId },
        });

        if (toolkit) {
          await this.prisma.agentToolkit.create({
            data: {
              agentId: agent.id,
              toolkitId: toolkitId,
              settings: {},
            },
          });
        } else {
          console.warn(`Warning: Toolkit ${toolkitId} not found, skipping...`);
        }
      } catch (error) {
        console.error(`Error assigning toolkit ${toolkitId} to agent:`, error);
      }
    }

    return agent;
  }

  async update(id: string, updateAgentDto: UpdateAgentDto) {
    await this.findOne(id);

    return this.prisma.agent.update({
      where: { id },
      data: {
        ...updateAgentDto,
      },
    });
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
