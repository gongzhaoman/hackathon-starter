import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealthStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'agent-api',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getReadinessStatus() {
    // 这里可以检查数据库连接、外部服务等
    const isReady = this.checkDependencies();

    return {
      status: isReady ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok', // 可以添加实际的数据库检查
        // 其他依赖检查
      },
    };
  }

  getLivenessStatus() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
    };
  }

  private checkDependencies(): boolean {
    // 实现依赖检查逻辑
    // 例如：检查数据库连接、Redis连接等
    return true;
  }
}