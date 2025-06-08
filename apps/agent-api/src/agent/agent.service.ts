import { Injectable, NotFoundException } from '@nestjs/common';

import { ToolsService } from '../tool/tools.service';

import { CreateAgentDto, UpdateAgentDto } from './agent.type';
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
    return this.prisma.agent.create({
      data: {
        name: createAgentDto.name,
        description: createAgentDto.description,
        prompt: createAgentDto.prompt,
        options: createAgentDto.options,
      },
    });
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
}
