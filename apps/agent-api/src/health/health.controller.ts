import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    const healthStatus = this.healthService.getHealthStatus();
    return ResponseBuilder.success(healthStatus, '服务状态正常');
  }

  @Get('ready')
  getReadiness() {
    const readinessStatus = this.healthService.getReadinessStatus();
    return ResponseBuilder.success(readinessStatus, '服务就绪');
  }

  @Get('live')
  getLiveness() {
    const livenessStatus = this.healthService.getLivenessStatus();
    return ResponseBuilder.success(livenessStatus, '服务存活');
  }
}