import { Injectable, OnModuleInit, Type, Logger } from '@nestjs/common';
import { DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';

import { PrismaService } from '../prisma/prisma.service';
import { Toolkit } from './interface/toolkit';
import { TOOLKIT_ID_KEY, TOOLKIT_TYPE_KEY } from './toolkits.decorator';

@Injectable()
export class ToolkitsService implements OnModuleInit {
  private toolkitMap = new Map<string, Type<Toolkit>>();
  private readonly logger = new Logger(ToolkitsService.name);

  constructor(
    private discoveryService: DiscoveryService,
    private reflector: Reflector,
    private prismaService: PrismaService,
    private moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    await this.discoverAndSyncToolkits();
  }

  private async discoverAndSyncToolkits() {
    this.logger.log('Starting toolkit discovery and synchronization');
    this.discoverToolkits();
    await this.syncToolkitsToDatabase();
    await this.cleanupObsoleteToolkits();
    this.logger.log('Toolkit discovery and synchronization completed');
  }

  private discoverToolkits() {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      const { metatype } = wrapper;
      if (!metatype) continue;
      const toolkitId = this.reflector.get(TOOLKIT_ID_KEY, metatype);
      if (!toolkitId) continue;
      if (this.toolkitMap.has(toolkitId)) {
        throw new Error(`Toolkit with ID ${toolkitId} is already registered.`);
      }
      this.toolkitMap.set(toolkitId, metatype as Type<Toolkit>);
      this.logger.log(`Discovered toolkit: ${toolkitId}`);
    }
  }

  private async syncToolkitsToDatabase() {
    const toolkits = Array.from(this.toolkitMap.values()).map(
      (ToolkitClass) => this.moduleRef.get(ToolkitClass),
    );
    for (const toolkit of toolkits) {
      const existingToolkit = await this.prismaService.toolkit.findUnique({
        where: { id: toolkit.id },
      });

      if (existingToolkit && existingToolkit.deleted) {
        this.logger.log(
          `Reactivating previously deleted toolkit: ${toolkit.id}`,
        );
      }

      // Get toolkit type from metadata
      const ToolkitClass = this.toolkitMap.get(toolkit.id);
      const toolkitType = this.reflector.get(TOOLKIT_TYPE_KEY, ToolkitClass) || 'BUSINESS';

      await this.prismaService.toolkit.upsert({
        where: { id: toolkit.id },
        update: {
          name: toolkit.name,
          description: toolkit.description,
          settings: toolkit.settings || undefined,
          type: toolkitType,
          deleted: false,
          updatedAt: new Date(),
        },
        create: {
          id: toolkit.id,
          name: toolkit.name,
          description: toolkit.description,
          settings: toolkit.settings || undefined,
          type: toolkitType,
        },
      });

      // Sync tools for this toolkit
      await this.syncToolsForToolkit(toolkit);
      
      this.logger.log(`Synced toolkit to database: ${toolkit.id}`);
    }
  }

  private async syncToolsForToolkit(toolkit: Toolkit) {
    const tools = await toolkit.getTools();
    const currentToolNames = tools.map(tool => tool.metadata.name);

    // Upsert current tools
    for (const tool of tools) {
      await this.prismaService.tool.upsert({
        where: { 
          name: tool.metadata.name
        },
        update: {
          description: tool.metadata.description,
          schema: tool.metadata.parameters,
          toolkitId: toolkit.id,
        },
        create: {
          name: tool.metadata.name,
          description: tool.metadata.description,
          schema: tool.metadata.parameters,
          toolkitId: toolkit.id,
        },
      });
    }

    // Remove tools that no longer exist in code
    const dbTools = await this.prismaService.tool.findMany({
      where: { toolkitId: toolkit.id },
      select: { id: true, name: true }
    });

    const toolsToDelete = dbTools.filter(dbTool => !currentToolNames.includes(dbTool.name));
    
    if (toolsToDelete.length > 0) {
      const toolIds = toolsToDelete.map(tool => tool.id);
      await this.prismaService.tool.deleteMany({
        where: { 
          id: { in: toolIds }
        }
      });
      
      this.logger.warn(`Deleted ${toolsToDelete.length} obsolete tools from toolkit ${toolkit.id}: ${toolsToDelete.map(t => t.name).join(', ')}`);
    }
  }

  private async cleanupObsoleteToolkits() {
    const dbToolkits = await this.prismaService.toolkit.findMany({
      where: { deleted: false },
    });

    for (const dbToolkit of dbToolkits) {
      if (!this.toolkitMap.has(dbToolkit.id)) {
        await this.prismaService.toolkit.update({
          where: { id: dbToolkit.id },
          data: { deleted: true },
        });
        await this.prismaService.tool.deleteMany({
          where: { toolkitId: dbToolkit.id },
        });
        this.logger.warn(`Marked toolkit as deleted: ${dbToolkit.id}`);
      }
    }
  }

  async getToolkitInstance(toolkitId: string, settings: any): Promise<Toolkit> {
    const ToolkitClass = this.getToolkitClass(toolkitId);
    if (!ToolkitClass) {
      throw new Error(`Unknown toolkit type: ${toolkitId}`);
    }

    const toolkitInstance = await this.moduleRef.get(ToolkitClass);
    await toolkitInstance.applySettings(settings);

    return toolkitInstance;
  }

  private getToolkitClass(id: string): Type<Toolkit> | undefined {
    return this.toolkitMap.get(id);
  }

  async getAgentToolkitInstances(agentId: string): Promise<Toolkit[]> {
    const agentToolkits = await this.prismaService.agentToolkit.findMany({
      where: { agentId },
      include: { toolkit: true },
    });

    return Promise.all(
      agentToolkits.map((at) =>
        this.getToolkitInstance(at.toolkit.id, at.settings),
      ),
    );
  }

  async getAllToolkits() {
    return this.prismaService.toolkit.findMany({
      where: { 
        deleted: false,
        type: 'BUSINESS'
      },
      include: {
        tools: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getAllToolkitsPaginated(params: {
    page: number;
    pageSize: number;
    skip: number;
    search?: string;
  }) {
    const baseWhere = {
      deleted: false,
      type: 'BUSINESS' as const
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

    const include = {
      tools: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    };

    // 并行执行查询和计数
    const [data, total] = await Promise.all([
      this.prismaService.toolkit.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.pageSize,
      }),
      this.prismaService.toolkit.count({ where })
    ]);

    return { data, total };
  }

  async getAgentToolkits(agentId: string) {
    return this.prismaService.agentToolkit.findMany({
      where: { agentId },
      include: { toolkit: true },
    });
  }

  async addToolkitToAgent(agentId: string, toolkitId: string, settings: any) {
    const internalSettings = {
      ...settings,
      agentId,
    };

    const result = await this.prismaService.agentToolkit.create({
      data: {
        agent: { connect: { id: agentId } },
        toolkit: { connect: { id: toolkitId } },
        settings: internalSettings,
      },
    });

    return this.filterSensitiveSettings(result);
  }

  async removeToolkitFromAgent(agentId: string, toolkitId: string) {
    return this.prismaService.agentToolkit.delete({
      where: {
        agentId_toolkitId: {
          agentId,
          toolkitId,
        },
      },
    });
  }

  async applyAgentToolkitSettings(
    agentId: string,
    toolkitId: string,
    settings: any,
  ) {
    const existingToolkit = await this.prismaService.agentToolkit.findUnique({
      where: {
        agentId_toolkitId: {
          agentId,
          toolkitId,
        },
      },
    });

    const updatedSettings = {
      ...settings,
      agentId: (existingToolkit?.settings as any).agentId || agentId,
    };

    return this.prismaService.agentToolkit.update({
      where: {
        agentId_toolkitId: {
          agentId,
          toolkitId,
        },
      },
      data: { settings: updatedSettings },
    });
  }

  filterSensitiveSettings(toolkit: any) {
    if (!toolkit) return toolkit;

    // 处理 AgentToolkit 类型的数据
    if (toolkit.settings && toolkit.toolkit) {
      const { agentId, ...visibleSettings } = toolkit.settings;
      return {
        ...toolkit,
        settings: visibleSettings,
      };
    }

    // 处理 Toolkit 类型的数据
    if (toolkit.settings) {
      const { agentId, ...visibleSettings } = toolkit.settings;
      return {
        ...toolkit,
        settings: visibleSettings,
      };
    }

    return toolkit;
  }
}
