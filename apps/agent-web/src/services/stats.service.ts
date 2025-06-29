import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/query-keys';

// 统计数据类型
export interface DashboardStats {
  agents: number;
  toolkits: number;
  workflows: number;
  tools: number;
}

// Query Options
export const statsQueryOptions = {
  // 获取仪表板统计数据
  dashboard: () => ({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async (): Promise<DashboardStats> => {
      const [agents, toolkits, workflows] = await Promise.all([
        apiClient.getAgents(),
        apiClient.getToolkits(),
        apiClient.getWorkflows(),
      ]);

      return {
        agents: agents.length,
        toolkits: toolkits.length,
        workflows: workflows.length,
        tools: toolkits.reduce((total: number, toolkit: any) => total + toolkit.tools.length, 0),
      };
    },
    staleTime: 1 * 60 * 1000, // 统计数据1分钟刷新
  }),
};

// Hooks
export const useDashboardStats = () => {
  return useQuery(statsQueryOptions.dashboard());
};
