import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/query-keys';
import type { CreateAgentDto, ChatWithAgentDto } from '../types';

// Query Options - 分离查询选项和 hooks
export const agentQueryOptions = {
  // 获取所有智能体
  list: (filters = {}) => ({
    queryKey: queryKeys.agents(filters),
    queryFn: () => apiClient.getAgents(),
    staleTime: 2 * 60 * 1000, // 2分钟
  }),

  // 获取单个智能体详情
  detail: (id: string) => ({
    queryKey: queryKeys.agent(id),
    queryFn: () => apiClient.getAgent(id),
    enabled: !!id,
  }),

  // 获取智能体的工具包
  toolkits: (id: string) => ({
    queryKey: queryKeys.agentToolkits(id),
    queryFn: async () => {
      const agent = await apiClient.getAgent(id);
      return agent.agentToolkits || [];
    },
    enabled: !!id,
  }),
};

// Hooks
export const useAgents = () => {
  return useQuery(agentQueryOptions.list());
};

export const useAgent = (id: string) => {
  return useQuery(agentQueryOptions.detail(id));
};

export const useAgentToolkits = (id: string) => {
  return useQuery(agentQueryOptions.toolkits(id));
};

// Mutations
export const useCreateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentDto) => apiClient.createAgent(data),
    onSuccess: (newAgent) => {
      // 乐观更新：立即将新智能体添加到列表中
      queryClient.setQueryData(queryKeys.agents({}), (old: any) => {
        if (!old) return [newAgent];
        return [newAgent, ...old];
      });

      // 使统计数据失效
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
    onSettled: () => {
      // 重新获取列表以确保数据一致性
      queryClient.invalidateQueries({ queryKey: queryKeys.agents({}) });
    },
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAgentDto> }) =>
      apiClient.updateAgent(id, data),
    onSuccess: (updatedAgent) => {
      // 更新智能体详情缓存
      queryClient.setQueryData(queryKeys.agent(updatedAgent.id), updatedAgent);
      // 使智能体列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.agents({}) });
    },
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      console.log('API 删除智能体请求:', id);
      return apiClient.deleteAgent(id);
    },
    onMutate: async (deletedId) => {
      console.log('开始乐观更新，删除智能体:', deletedId);

      // 取消正在进行的查询，避免覆盖我们的乐观更新
      await queryClient.cancelQueries({ queryKey: queryKeys.agents({}) });

      // 获取当前的智能体列表
      const previousAgents = queryClient.getQueryData(queryKeys.agents({}));
      console.log('当前智能体列表:', previousAgents);

      // 乐观更新：立即从列表中移除被删除的智能体
      queryClient.setQueryData(queryKeys.agents({}), (old: any) => {
        if (!old) return old;
        const newList = old.filter((agent: any) => agent.id !== deletedId);
        console.log('更新后的智能体列表:', newList);
        return newList;
      });

      // 返回上下文，以便在错误时回滚
      return { previousAgents };
    },
    onError: (error, __, context) => {
      console.error('删除智能体失败，回滚状态:', error);
      // 如果删除失败，回滚到之前的状态
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents({}), context.previousAgents);
      }
    },
    onSuccess: (_, deletedId) => {
      console.log('删除智能体成功:', deletedId);
      // 移除智能体详情缓存
      queryClient.removeQueries({ queryKey: queryKeys.agent(deletedId) });
      // 移除相关的工具包缓存
      queryClient.removeQueries({ queryKey: queryKeys.agentToolkits(deletedId) });
      // 使统计数据失效
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
    onSettled: () => {
      console.log('删除操作完成，重新获取数据');
      // 无论成功还是失败，都重新获取智能体列表以确保数据一致性
      queryClient.invalidateQueries({ queryKey: queryKeys.agents({}) });
    },
  });
};

export const useChatWithAgent = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChatWithAgentDto }) =>
      apiClient.chatWithAgent(id, data),
  });
};
