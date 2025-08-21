import { FunctionTool } from 'llamaindex';
import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@toolkitId('knowledge-base-explorer-toolkit-01', 'SYSTEM')
export class KnowledgeBaseExplorerToolkit extends BaseToolkit {
  name = 'knowledge base explorer toolkit';
  description = '知识库发现工具包，用于工作流编排时发现和了解可用的知识库';
  tools: FunctionTool<any, any>[] = [];
  settings = {};
  private readonly logger = new Logger(KnowledgeBaseExplorerToolkit.name);
  
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async getTools() {
    if (this.tools.length === 0) {
      // 获取所有知识库列表工具
      const listAllKnowledgeBasesTool = FunctionTool.from(
        async () => {
          try {
            const knowledgeBases = await this.prismaService.knowledgeBase.findMany({
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                _count: {
                  select: {
                    files: {
                      where: {
                        status: 'PROCESSED'
                      }
                    }
                  }
                }
              },
            });
            
            const result = knowledgeBases.map(kb => ({
              id: kb.id,
              name: kb.name,
              description: kb.description,
              processedFileCount: kb._count.files,
              createdAt: kb.createdAt,
            }));
            
            this.logger.log('All available knowledge bases:', JSON.stringify(result, null, 2));
            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to list all knowledge bases:', error);
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: 'listAllKnowledgeBases',
          description: '获取系统中所有可用的知识库列表，用于工作流编排时选择合适的知识库',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        } as any,
      );

      // 获取知识库详细信息工具
      const checkKnowledgeBaseDetailTool = FunctionTool.from(
        async ({ knowledgeBaseId }: { knowledgeBaseId: string }) => {
          try {
            const knowledgeBase = await this.prismaService.knowledgeBase.findUnique({
              where: { id: knowledgeBaseId },
              include: {
                files: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    createdAt: true,
                  },
                },
                _count: {
                  select: {
                    agentKnowledgeBases: true,
                  },
                },
              },
            });

            if (!knowledgeBase) {
              return JSON.stringify({ error: '知识库不存在' }, null, 2);
            }

            const result = {
              id: knowledgeBase.id,
              name: knowledgeBase.name,
              description: knowledgeBase.description,
              totalFiles: knowledgeBase.files.length,
              processedFiles: knowledgeBase.files.filter(f => f.status === 'PROCESSED').length,
              linkedAgents: knowledgeBase._count.agentKnowledgeBases,
              files: knowledgeBase.files.map(f => ({
                id: f.id,
                name: f.name,
                status: f.status,
                createdAt: f.createdAt,
              })),
              createdAt: knowledgeBase.createdAt,
            };

            this.logger.log('Knowledge base detail:', JSON.stringify(result, null, 2));
            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to get knowledge base detail:', error);
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: 'checkKnowledgeBaseDetail',
          description: '获取指定知识库的详细信息，包括文件数量、处理状态等',
          parameters: {
            type: 'object',
            properties: {
              knowledgeBaseId: {
                type: 'string',
                description: '知识库ID，从 listAllKnowledgeBases 获取',
              },
            },
            required: ['knowledgeBaseId'],
          },
        } as any,
      );

      this.tools = [listAllKnowledgeBasesTool, checkKnowledgeBaseDetailTool];
    }
    return this.tools;
  }

  validateSettings(): void {
    // 这个工具包不需要特殊设置
  }
}
