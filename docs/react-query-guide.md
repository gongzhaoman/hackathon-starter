# React Query 状态管理实践

## 查询键设计规范

### 层级化查询键

```typescript
// 查询键工厂 (lib/query-keys.ts)
export const queryKeys = {
  all: ['agent-platform'] as const,

  // 智能体相关
  agents: (params?: Record<string, unknown>) =>
    [...queryKeys.all, 'agents', params || {}] as const,
  agent: (id: string) =>
    [...queryKeys.all, 'agents', id] as const,
  agentToolkits: (agentId: string) =>
    [...queryKeys.all, 'agents', agentId, 'toolkits'] as const,

  // 工作流相关
  workflows: () => [...queryKeys.all, 'workflows'] as const,
  workflow: (id: string) => [...queryKeys.all, 'workflows', id] as const,
};
```

### 类型安全的查询选项

```typescript
// 智能体查询选项 (services/agent.service.ts)
export const agentQueryOptions = {
  list: (filters?: Record<string, unknown>) => ({
    queryKey: queryKeys.agents(filters),
    queryFn: () => apiClient.get<Agent[]>('/agents'),
    staleTime: 2 * 60 * 1000, // 2分钟
  }),

  detail: (id: string) => ({
    queryKey: queryKeys.agent(id),
    queryFn: () => apiClient.get<Agent>(`/agents/${id}`),
    enabled: !!id,
  }),
};
```

## 缓存策略优化

### 差异化缓存时间

```typescript
// 根据数据变化频率设置不同缓存时间
export const cacheConfig = {
  // 静态数据 - 长缓存
  toolkits: 10 * 60 * 1000,     // 10分钟
  tools: 10 * 60 * 1000,        // 10分钟

  // 动态数据 - 短缓存
  agents: 2 * 60 * 1000,        // 2分钟
  workflows: 1 * 60 * 1000,     // 1分钟

  // 实时数据 - 极短缓存
  workflowStatus: 30 * 1000,    // 30秒
};
```

### 智能重试机制

```typescript
// 查询客户端配置 (lib/query-client.ts)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 客户端错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // 服务器错误重试，最多3次
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

## 乐观更新模式

### 智能体CRUD乐观更新

```typescript
// 创建智能体乐观更新 (services/agent.service.ts)
export const useCreateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentDto) => apiClient.post('/agents', data),
    onMutate: async (newAgent) => {
      // 取消进行中的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.agents() });

      // 保存当前状态
      const previousAgents = queryClient.getQueryData(queryKeys.agents());

      // 乐观更新
      queryClient.setQueryData(queryKeys.agents(), (old: Agent[] = []) => [
        { ...newAgent, id: `temp-${Date.now()}` },
        ...old
      ]);

      return { previousAgents };
    },
    onError: (_, __, context) => {
      // 错误回滚
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents(), context.previousAgents);
      }
    },
    onSuccess: (newAgent, _, context) => {
      // 替换临时数据
      queryClient.setQueryData(queryKeys.agents(), (old: Agent[] = []) =>
        old.map(agent =>
          agent.id.startsWith('temp-') ? newAgent : agent
        )
      );
    },
  });
};
```

### 级联缓存更新

```typescript
// 删除智能体时的级联更新
export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    onSuccess: (_, deletedId) => {
      // 移除详情缓存
      queryClient.removeQueries({ queryKey: queryKeys.agent(deletedId) });

      // 移除关联缓存
      queryClient.removeQueries({ queryKey: queryKeys.agentToolkits(deletedId) });

      // 更新列表缓存
      queryClient.setQueryData(queryKeys.agents(), (old: Agent[] = []) =>
        old.filter(agent => agent.id !== deletedId)
      );

      // 失效统计数据
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
  });
};
```

## 条件查询与预加载

### 智能条件查询

```typescript
// 条件查询Hook
export const useAgentDetails = (agentId: string, withToolkits = false) => {
  const agentQuery = useQuery({
    ...agentQueryOptions.detail(agentId),
    enabled: !!agentId,
  });

  const toolkitsQuery = useQuery({
    ...toolkitQueryOptions.byAgent(agentId),
    enabled: !!agentId && withToolkits,
  });

  return {
    agent: agentQuery.data,
    toolkits: toolkitsQuery.data,
    isLoading: agentQuery.isLoading || (withToolkits && toolkitsQuery.isLoading),
    error: agentQuery.error || toolkitsQuery.error,
  };
};
```

### 预加载策略

```typescript
// 智能预加载 (pages/Agents.tsx)
const AgentList = () => {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();

  const handleAgentHover = (agentId: string) => {
    // 预加载智能体详情
    queryClient.prefetchQuery(agentQueryOptions.detail(agentId));
  };

  return (
    <div>
      {agents?.map(agent => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onMouseEnter={() => handleAgentHover(agent.id)}
        />
      ))}
    </div>
  );
};
```

## 错误边界与降级

### 组件级错误处理

```typescript
// 查询错误处理Hook
export const useAgentsWithFallback = () => {
  const query = useQuery({
    ...agentQueryOptions.list(),
    onError: (error) => {
      console.error('获取智能体列表失败:', error);
    }
  });

  return {
    ...query,
    data: query.data || [], // 错误时提供空数组
    hasError: query.isError,
  };
};
```

### 离线支持

```typescript
// 离线缓存策略
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // 优先使用缓存
      gcTime: 24 * 60 * 60 * 1000, // 离线时保留24小时
    },
  },
});
```

## 性能监控

### 查询性能追踪

```typescript
// 查询性能监控
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onSuccess: (data, query) => {
        console.log(`查询成功: ${query.queryKey} - ${query.dataUpdatedAt}`);
      },
      onError: (error, query) => {
        console.error(`查询失败: ${query.queryKey}`, error);
      },
    },
  },
});
```

### 缓存命中率统计

```typescript
// 开发环境性能统计
if (process.env.NODE_ENV === 'development') {
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === 'updated') {
      console.log(`缓存更新: ${event.query.queryKey}`);
    }
  });
}
```
