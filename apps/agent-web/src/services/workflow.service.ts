import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/query-keys';
import type { CreateWorkflowDto, GenerateDslDto, ExecuteWorkflowDto } from '../types';

// Query Options
export const workflowQueryOptions = {
  // 获取所有工作流
  list: (filters?: Record<string, unknown>) => ({
    queryKey: queryKeys.workflows(filters),
    queryFn: () => apiClient.getWorkflows(),
    staleTime: 2 * 60 * 1000, // 2分钟
  }),

  // 获取单个工作流详情
  detail: (id: string) => ({
    queryKey: queryKeys.workflow(id),
    queryFn: () => apiClient.getWorkflow(id),
    enabled: !!id,
  }),
};

// Hooks
export const useWorkflows = () => {
  return useQuery(workflowQueryOptions.list());
};

export const useWorkflow = (id: string) => {
  return useQuery(workflowQueryOptions.detail(id));
};

// Mutations
export const useGenerateDsl = () => {
  return useMutation({
    mutationFn: (data: GenerateDslDto) => apiClient.generateDsl(data),
    // DSL 生成不需要缓存，每次都是新的
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkflowDto) => apiClient.createWorkflow(data),
    onSuccess: (newWorkflow) => {
      // 乐观更新：立即将新工作流添加到列表中
      queryClient.setQueryData(queryKeys.workflows(), (old: any) => {
        if (!old) return [newWorkflow];
        return [newWorkflow, ...old];
      });

      // 使统计数据失效
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
    onSettled: () => {
      // 重新获取列表以确保数据一致性
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
    },
  });
};

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteWorkflow(id),
    onMutate: async (deletedId) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: queryKeys.workflows() });

      // 获取当前的工作流列表
      const previousWorkflows = queryClient.getQueryData(queryKeys.workflows());

      // 乐观更新：立即从列表中移除被删除的工作流
      queryClient.setQueryData(queryKeys.workflows(), (old: any) => {
        if (!old) return old;
        return old.filter((workflow: any) => workflow.id !== deletedId);
      });

      return { previousWorkflows };
    },
    onError: (_, __, context) => {
      // 如果删除失败，回滚到之前的状态
      if (context?.previousWorkflows) {
        queryClient.setQueryData(queryKeys.workflows(), context.previousWorkflows);
      }
    },
    onSuccess: (_, deletedId) => {
      // 移除工作流详情缓存
      queryClient.removeQueries({ queryKey: queryKeys.workflow(deletedId) });
      // 移除相关的执行缓存
      queryClient.removeQueries({ queryKey: queryKeys.workflowExecution(deletedId) });
      // 使统计数据失效
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
    },
    onSettled: () => {
      // 重新获取列表以确保数据一致性
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows() });
    },
  });
};

export const useExecuteWorkflow = () => {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExecuteWorkflowDto }) =>
      apiClient.executeWorkflow(id, data),
    // 工作流执行结果不需要缓存
  });
};
