import { FunctionTool } from 'llamaindex';
import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { KnowledgeBaseService } from '../../knowledge-base/knowledge-base.service';
import { MetadataFilterRequest } from '../../knowledge-base/knowledge-base.type';
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
      // 知识库查询工具（系统提示词中已包含所有可用知识库信息）
      const queryKnowledgeBaseTool = FunctionTool.from(
        async ({ knowledgeBaseId, query, metadataFilters }: { 
          knowledgeBaseId: string; 
          query: string; 
          metadataFilters?: MetadataFilterRequest 
        }) => {
          try {
            // 验证智能体是否有权限访问该知识库
            const agentKnowledgeBases = await this.knowledgeBaseService.getAgentKnowledgeBases(
              this.settings.agentId as string,
            );
            const hasAccess = agentKnowledgeBases.some((akb: any) => akb.knowledgeBase.id === knowledgeBaseId);

            if (!hasAccess) {
              return JSON.stringify({ error: '智能体无权限访问该知识库' }, null, 2);
            }

            const result = await this.knowledgeBaseService.query(knowledgeBaseId, query, metadataFilters);
            this.logger.log('Query:', query);
            this.logger.log('Metadata Filters:', JSON.stringify(metadataFilters, null, 2));
            this.logger.log('Result:', JSON.stringify(result, null, 2));
            return JSON.stringify(result, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to query knowledge base:', error);
            return JSON.stringify({ error: error.message }, null, 2);
          }
        },
        {
          name: 'queryKnowledgeBase',
          description: `在指定的知识库中查询信息，支持高级元数据过滤。返回5-10条最相关的原始文本片段。

🎯 **快速使用**：
- 系统提示词中已包含所有可用知识库的详细信息
- 直接使用对应的知识库ID进行查询
- 根据需要添加元数据过滤条件

💡 **过滤功能说明**：
- 支持多种操作符：==（等于）、!=（不等于）、>（大于）、<（小于）、>=（大于等于）、<=（小于等于）、in（包含）、nin（不包含）、text_match（文本匹配）
- 支持AND/OR逻辑组合
- 可同时使用多个过滤条件

📊 **智能结果筛选**：
- 最少返回5条结果，最多10条
- 当有超过5条结果且得分>9时，优先返回高分结果
- 结果按相关性排序`,
          parameters: {
            type: 'object',
            properties: {
              knowledgeBaseId: {
                type: 'string',
                description: '知识库ID，从系统提示词中的知识库列表获取'
              },
              query: {
                type: 'string',
                description: '要查询的问题或关键词'
              },
              metadataFilters: {
                type: 'object',
                description: `高级元数据过滤条件，支持复杂逻辑组合。

📋 结构格式：
{
  "filters": [
    {"key": "字段名", "value": "值", "operator": "操作符"}
  ],
  "condition": "AND|OR"  // 可选，默认AND
}

🛠️ 操作符说明：
- "==" : 等于（适用于所有类型）
- "!=" : 不等于（适用于所有类型）  
- ">" / "<" / ">=" / "<=" : 大小比较（适用于数字、日期）
- "in" : 包含在列表中（适用于数组、枚举）
- "nin" : 不包含在列表中（适用于数组、枚举）
- "text_match" : 文本匹配（适用于字符串）

📝 使用示例：
1. 简单过滤：
   {"filters": [{"key": "author", "value": "张三", "operator": "=="}]}

2. 范围查询：
   {"filters": [{"key": "priority", "value": 5, "operator": ">="}, {"key": "priority", "value": 8, "operator": "<="}], "condition": "AND"}

3. 多条件组合：
   {"filters": [{"key": "category", "value": "技术文档", "operator": "=="}, {"key": "tags", "value": ["重要", "紧急"], "operator": "in"}], "condition": "AND"}

4. OR条件：
   {"filters": [{"key": "author", "value": "张三", "operator": "=="}, {"key": "author", "value": "李四", "operator": "=="}], "condition": "OR"}

⚠️ 注意：请根据系统提示词中的元数据schema信息选择正确的字段名和操作符。`,
                properties: {
                  filters: {
                    type: 'array',
                    description: '过滤条件数组',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string', description: '元数据字段名' },
                        value: { description: '过滤值（可以是字符串、数字、布尔值或数组）' },
                        operator: { 
                          type: 'string', 
                          enum: ['==', '!=', '>', '<', '>=', '<=', 'in', 'nin', 'text_match'],
                          description: '过滤操作符' 
                        }
                      },
                      required: ['key', 'value', 'operator']
                    }
                  },
                  condition: {
                    type: 'string',
                    enum: ['AND', 'OR'],
                    description: '过滤条件间的逻辑关系，默认为AND'
                  }
                }
              },
            },
            required: ['knowledgeBaseId', 'query'],
          },
        } as any,
      );

      this.tools = [queryKnowledgeBaseTool];
    }
    return this.tools;
  }

  validateSettings(): void {
    if (!this.settings.agentId) {
      throw new Error('agentId is required');
    }
  }
}
