/**
 * 查询键工厂 - 统一管理所有缓存键
 * 遵循统一的根键 + 资源层级结构
 */

export const queryKeys = {
  // 所有查询的根键
  all: ['app'] as const,

  // 智能体相关查询
  agents: (params?: Record<string, unknown>) => [...queryKeys.all, 'agents', params || {}] as const,
  agent: (id: string) => [...queryKeys.all, 'agents', id] as const,
  agentToolkits: (agentId: string) => [...queryKeys.all, 'agents', agentId, 'toolkits'] as const,
  agentChat: (agentId: string) => [...queryKeys.all, 'agents', agentId, 'chat'] as const,

  // 工具包相关查询
  toolkits: (params?: Record<string, unknown>) => [...queryKeys.all, 'toolkits', params || {}] as const,
  toolkit: (id: string) => [...queryKeys.all, 'toolkits', id] as const,
  toolkitTools: (toolkitId: string) => [...queryKeys.all, 'toolkits', toolkitId, 'tools'] as const,

  // 工作流相关查询
  workflows: (params?: Record<string, unknown>) => [...queryKeys.all, 'workflows', params || {}] as const,
  workflow: (id: string) => [...queryKeys.all, 'workflows', id] as const,
  workflowExecution: (workflowId: string) => [...queryKeys.all, 'workflows', workflowId, 'execution'] as const,
  workflowDslGeneration: () => [...queryKeys.all, 'workflows', 'dsl-generation'] as const,

  // 知识库相关查询
  knowledgeBases: (params?: Record<string, unknown>) => [...queryKeys.all, 'knowledge-bases', params || {}] as const,
  knowledgeBase: (id: string) => [...queryKeys.all, 'knowledge-bases', id] as const,
  knowledgeBaseFiles: (kbId: string) => [...queryKeys.all, 'knowledge-bases', kbId, 'files'] as const,
  knowledgeBaseQuery: (kbId: string) => [...queryKeys.all, 'knowledge-bases', kbId, 'query'] as const,

  // 统计数据相关查询
  dashboardStats: () => [...queryKeys.all, 'stats', 'dashboard'] as const,
} as const;

// 类型安全的查询键类型
export type QueryKeys = typeof queryKeys;
