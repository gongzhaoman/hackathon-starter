import { PrismaService } from '../../prisma/prisma.service';  // 导入 PrismaService

import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { ToolsType } from '../interface/toolkit';

@toolkitId('tool-explorer-toolkit-01')
export class ToolExplorerToolkit extends BaseToolkit {
  name = '工具查询工具箱';
  description = '用于查询系统内所有已注册工具的名称、描述和参数定义。';
  settings = {};

  tools: ToolsType[] = [];

  constructor(
    private readonly prismaService: PrismaService,
  ) {
    super();
  }

  validateSettings(): void {}

  protected async initTools(): Promise<void> {
    const llamaindexModules = await this.llamaindexService.getLlamaindexModules()
    const FunctionTool = llamaindexModules.FunctionTool
    this.tools = [
      FunctionTool.from(this.listAllTools.bind(this), {
        name: 'listAllTools',
        description: '查询系统中所有可用工具的名称、描述和参数格式。',
        parameters: {
          type: 'object',
          properties: {},
        },
      }),
      FunctionTool.from(this.checkToolDetail.bind(this), {
        name: 'checkToolDetail',
        description: '查询指定工具的详细信息。',
        parameters: {
          type: 'object',
          properties: {
            toolName: {
              type: 'string',
              description: '要查询的工具名称。',
            },
          },
          required: ['toolName'],
        },
      }),
    ];
  }

  async listAllTools(): Promise<
    { name: string; description: string }[] | string
  > {
    // 只返回业务工具包中的工具
    const tools = await this.prismaService.tool.findMany({
      where: {
        toolkit: {
          type: 'BUSINESS'
        }
      },
      include: {
        toolkit: {
          select: {
            name: true
          }
        }
      }
    });
    if (tools.length === 0) {
      return 'No business tools found';
    }
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      toolkit: tool.toolkit.name,
    }));
  }

  async checkToolDetail(toolName: string): Promise<
    | {
        name: string;
        description: string;
        parameters: any;
      }
    | string
  > {
    const tool = await this.prismaService.tool.findUnique({
      where: {
        name: toolName,
        toolkit: {
          type: 'BUSINESS'
        }
      },
    });
    if (!tool) {
      return `Business tool ${toolName} not found`;
    }
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    };
  }
}
