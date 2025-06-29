import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据保持新鲜 5 分钟
      staleTime: 5 * 60 * 1000,
      // 缓存数据 10 分钟
      gcTime: 10 * 60 * 1000,
      // 重试配置
      retry: (failureCount, error: any) => {
        // 4xx 错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // 最多重试 3 次
        return failureCount < 3;
      },
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 变更重试配置
      retry: (failureCount, error: any) => {
        // 4xx 错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // 最多重试 1 次
        return failureCount < 1;
      },
    },
  },
});
