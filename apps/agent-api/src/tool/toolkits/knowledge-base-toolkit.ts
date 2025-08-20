import { FunctionTool } from 'llamaindex';
import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { Logger } from '@nestjs/common';

@toolkitId('knowledge-base-toolkit-01')
export class KnowledgeBaseToolkit extends BaseToolkit {
  name = 'knowledge base toolkit';
  description = '知识库工具包，提供知识库查询和管理功能';
  tools: FunctionTool<any, any>[] = [];
  settings = { agentId: '' };
  private readonly logger = new Logger(KnowledgeBaseToolkit.name);
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {
    super();
  }

  async getTools() {
    if (this.tools.length === 0) {
      // 获取智能体可访问的知识库列表工具
      const listKnowledgeBasesTool = FunctionTool.from(
        async () => {
          try {
            const agentKnowledgeBases = await this.knowledgeBaseService.getAgentKnowledgeBases(
              this.settings.agentId as string,
            );
            const result = agentKnowledgeBases.map((akb: any) => ({
              id: akb.knowledgeBase.id,
              name: akb.knowledgeBase.name,
              description: akb.knowledgeBase.description,
            }));
            this.logger.log('Available knowledge bases:', JSON.stringify(result, null, 2));
            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to list knowledge bases:', error);
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: 'listAgentKnowledgeBases',
          description: '获取当前智能体可以访问的知识库列表',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        } as any,
      );

      // 知识库查询工具
      const queryKnowledgeBaseTool = FunctionTool.from(
        async ({ knowledgeBaseId, query }: { knowledgeBaseId: string; query: string }) => {
          try {
            // 验证智能体是否有权限访问该知识库
            const agentKnowledgeBases = await this.knowledgeBaseService.getAgentKnowledgeBases(
              this.settings.agentId as string,
            );
            const hasAccess = agentKnowledgeBases.some((akb: any) => akb.knowledgeBase.id === knowledgeBaseId);

            if (!hasAccess) {
              return JSON.stringify({ error: '智能体无权限访问该知识库' }, null, 2);
            }

            const answer = await this.knowledgeBaseService.chat(knowledgeBaseId, query);
            this.logger.log('Query:', query);
            this.logger.log('Answer:', JSON.stringify(answer, null, 2));
            return JSON.stringify(answer, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to query knowledge base:', error);
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: 'queryKnowledgeBase',
          description: '在指定的知识库中查询信息。使用前请先调用 listAgentKnowledgeBases 获取可用的知识库列表',
          parameters: {
            type: 'object',
            properties: {
              knowledgeBaseId: {
                type: 'string',
                description: '知识库ID，从 listAgentKnowledgeBases 获取'
              },
              query: {
                type: 'string',
                description: '要查询的问题'
              },
            },
            required: ['knowledgeBaseId', 'query'],
          },
        } as any,
      );

      this.tools = [listKnowledgeBasesTool, queryKnowledgeBaseTool];
    }
    return this.tools;
  }

  validateSettings(): void {
    if (!this.settings.agentId) {
      throw new Error('agentId is required');
    }
  }
}
