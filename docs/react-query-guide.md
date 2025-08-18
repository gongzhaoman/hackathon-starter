# React Query 技术原理与项目实践指南

## 目录

- [React Query 技术原理](#react-query-技术原理)
- [项目中的使用实践](#项目中的使用实践)
- [最佳实践总结](#最佳实践总结)
- [常见问题与解决方案](#常见问题与解决方案)

---

## React Query 技术原理

### 1. 核心概念

React Query (现称为 TanStack Query) 是一个用于 React 应用的数据获取库，它提供了强大的服务器状态管理能力。

#### 1.1 服务器状态 vs 客户端状态

```typescript
// 客户端状态 - 应用本地拥有的状态
const [isModalOpen, setIsModalOpen] = useState(false);

// 服务器状态 - 存储在远程服务器的状态
const { data: agents } = useQuery({
  queryKey: ['agents'],
  queryFn: () => fetchAgents()
});
```

#### 1.2 查询键 (Query Keys) 系统

查询键是 React Query 的核心概念，用于：
- 唯一标识查询
- 缓存管理
- 自动重新获取
- 依赖跟踪

```typescript
// 简单查询键
['agents']

// 层级查询键
['agents', 'list', { page: 1, status: 'active' }]

// 详情查询键
['agents', id]
```

### 2. 缓存机制

#### 2.1 多层缓存策略

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 数据新鲜度：5分钟
      gcTime: 10 * 60 * 1000,    // 垃圾回收：10分钟
    },
  },
});
```

**状态转换流程：**
```
fresh → stale → inactive → garbage collected
  ↑       ↑        ↑           ↑
 请求时   5分钟后  组件卸载后   10分钟后
```

#### 2.2 缓存键匹配算法

React Query 使用深度比较来匹配查询键：

```typescript
// 这些是不同的查询键
['agents', undefined]  // ❌
['agents', {}]         // ❌ 
['agents']             // ❌

// 解决方案：规范化查询键
agents: (params?: Record<string, unknown>) => 
  [...queryKeys.all, 'agents', params || {}] as const
```

### 3. 状态管理机制

#### 3.1 查询状态

```typescript
interface QueryState {
  data: any;           // 查询数据
  error: Error | null; // 错误信息
  isLoading: boolean;  // 首次加载
  isFetching: boolean; // 任何获取中
  isSuccess: boolean;  // 成功状态
  isError: boolean;    // 错误状态
  isStale: boolean;    // 数据是否过期
}
```

#### 3.2 后台重新获取

```typescript
// 自动重新获取的触发条件
- 窗口重新聚焦 (refetchOnWindowFocus)
- 网络重新连接 (refetchOnReconnect)
- 定时轮询 (refetchInterval)
- 查询键失效 (invalidateQueries)
```

### 4. 重试机制

#### 4.1 智能重试策略

```typescript
retry: (failureCount, error: any) => {
  // 客户端错误不重试
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }
  // 服务器错误重试，最多3次
  return failureCount < 3;
},
// 指数退避延迟
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
```

**重试时间序列：**
```
尝试1 → 失败 → 等待1s → 尝试2 → 失败 → 等待2s → 尝试3 → 失败 → 等待4s → 尝试4
```

---

## 项目中的使用实践

### 1. 架构设计

#### 1.1 目录结构

```
src/
├── lib/
│   ├── query-client.ts    # 查询客户端配置
│   ├── query-keys.ts      # 查询键工厂
│   └── api.ts             # API 客户端
├── services/              # 业务服务层
│   ├── agent.service.ts
│   ├── workflow.service.ts
│   └── toolkit.service.ts
└── pages/                 # 页面组件
```

#### 1.2 查询键工厂设计

```typescript
export const queryKeys = {
  all: ['agent-platform'] as const,
  
  // 层级式查询键设计
  agents: (params?: Record<string, unknown>) => 
    [...queryKeys.all, 'agents', params || {}] as const,
  agent: (id: string) => 
    [...queryKeys.all, 'agents', id] as const,
  agentToolkits: (agentId: string) => 
    [...queryKeys.all, 'agents', agentId, 'toolkits'] as const,
};
```

**设计优势：**
- 类型安全
- 层级清晰
- 便于批量失效
- 避免命名冲突

### 2. 服务层模式

#### 2.1 查询选项与 Hooks 分离

```typescript
// Query Options - 可复用的查询配置
export const agentQueryOptions = {
  list: (filters?: Record<string, unknown>) => ({
    queryKey: queryKeys.agents(filters),
    queryFn: () => apiClient.getAgents(),
    staleTime: 2 * 60 * 1000,
  }),
  
  detail: (id: string) => ({
    queryKey: queryKeys.agent(id),
    queryFn: () => apiClient.getAgent(id),
    enabled: !!id,
  }),
};

// Hooks - 简化的使用接口
export const useAgents = () => useQuery(agentQueryOptions.list());
export const useAgent = (id: string) => useQuery(agentQueryOptions.detail(id));
```

#### 2.2 统一的 API 客户端

```typescript
class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // 统一错误处理
    // 统一请求头
    // 统一响应处理
  }
  
  // RESTful API 方法
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T>
  async post<T>(endpoint: string, data?: any): Promise<T>
  async put<T>(endpoint: string, data?: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
}
```

### 3. 缓存优化策略

#### 3.1 乐观更新

```typescript
export const useCreateAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateAgentDto) => apiClient.createAgent(data),
    onSuccess: (newAgent) => {
      // 立即更新缓存，无需等待服务器响应
      queryClient.setQueryData(queryKeys.agents(), (old: any) => {
        if (!old) return [newAgent];
        return [newAgent, ...old];
      });
    },
  });
};
```

#### 3.2 错误回滚机制

```typescript
export const useDeleteAgent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    onMutate: async (deletedId) => {
      // 保存当前状态
      const previousAgents = queryClient.getQueryData(queryKeys.agents());
      
      // 乐观更新
      queryClient.setQueryData(queryKeys.agents(), (old: any) => 
        old?.filter((agent: any) => agent.id !== deletedId)
      );
      
      return { previousAgents };
    },
    onError: (_, __, context) => {
      // 错误时回滚
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents(), context.previousAgents);
      }
    },
  });
};
```

#### 3.3 精确缓存失效

```typescript
// 相关数据联动更新
onSuccess: (_, deletedId) => {
  // 移除详情缓存
  queryClient.removeQueries({ queryKey: queryKeys.agent(deletedId) });
  
  // 移除关联缓存
  queryClient.removeQueries({ queryKey: queryKeys.agentToolkits(deletedId) });
  
  // 更新统计数据
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
},
```

### 4. 性能优化

#### 4.1 差异化缓存策略

```typescript
export const toolkitQueryOptions = {
  list: () => ({
    queryKey: queryKeys.toolkits(),
    queryFn: () => apiClient.getToolkits(),
    staleTime: 10 * 60 * 1000, // 工具包变化少，缓存10分钟
  }),
};

export const agentQueryOptions = {
  list: () => ({
    queryKey: queryKeys.agents(),
    queryFn: () => apiClient.getAgents(),
    staleTime: 2 * 60 * 1000,  // 智能体变化多，缓存2分钟
  }),
};
```

#### 4.2 条件查询

```typescript
export const useAgent = (id: string) => {
  return useQuery({
    ...agentQueryOptions.detail(id),
    enabled: !!id, // 只有当 id 存在时才执行查询
  });
};
```

---

## 最佳实践总结

### 1. 查询键设计原则

✅ **推荐做法：**
```typescript
// 使用工厂函数，确保一致性
agents: (params?: Record<string, unknown>) => 
  [...queryKeys.all, 'agents', params || {}] as const

// 层级设计，便于管理
agentToolkits: (agentId: string) => 
  [...queryKeys.all, 'agents', agentId, 'toolkits'] as const
```

❌ **避免做法：**
```typescript
// 硬编码字符串
const queryKey = 'agents-list';

// 不一致的参数处理
agents: (params) => ['agents', params] // undefined vs {}
```

### 2. 错误处理策略

✅ **推荐做法：**
```typescript
// 区分错误类型，智能重试
retry: (failureCount, error) => {
  if (error?.status >= 400 && error?.status < 500) return false;
  return failureCount < 3;
}

// 统一错误处理
const { data, error, isError } = useAgents();
if (isError) {
  // 统一错误提示
}
```

### 3. 状态管理模式

✅ **推荐做法：**
```typescript
// 分离 loading 状态
const { data: agents = [], isLoading } = useAgents();
const { data: toolkits = [], isLoading: toolkitsLoading } = useToolkits();

const loading = isLoading || toolkitsLoading;
```

### 4. 性能优化技巧

✅ **推荐做法：**
```typescript
// 使用 select 减少重渲染
const agentNames = useQuery({
  ...agentQueryOptions.list(),
  select: (data) => data.map(agent => agent.name)
});

// 预获取相关数据
const queryClient = useQueryClient();
queryClient.prefetchQuery(agentQueryOptions.detail(agentId));
```

---

## 常见问题与解决方案

### 1. 缓存键不一致问题

**问题：** `undefined` 和 `{}` 产生不同的缓存键

**解决方案：**
```typescript
// 规范化参数
agents: (params?: Record<string, unknown>) => 
  [...queryKeys.all, 'agents', params || {}] as const
```

### 2. 内存泄漏问题

**问题：** 长时间运行导致缓存过多

**解决方案：**
```typescript
// 合理设置垃圾回收时间
gcTime: 10 * 60 * 1000, // 10分钟

// 及时移除不需要的查询
queryClient.removeQueries({ queryKey: queryKeys.agent(deletedId) });
```

### 3. 竞态条件问题

**问题：** 快速切换页面导致数据错乱

**解决方案：**
```typescript
// 使用 onMutate 取消进行中的查询
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey: queryKeys.agents() });
}
```

### 4. 开发调试

**推荐工具：**
```typescript
// 开发环境启用 DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## 总结

React Query 为我们的项目提供了：

1. **强大的缓存管理** - 自动的数据同步和缓存失效
2. **优秀的用户体验** - 乐观更新和后台重新获取
3. **可靠的错误处理** - 智能重试和错误回滚
4. **类型安全** - 完整的 TypeScript 支持
5. **性能优化** - 减少不必要的网络请求

通过合理的架构设计和最佳实践，我们构建了一个高效、可维护的数据管理层。