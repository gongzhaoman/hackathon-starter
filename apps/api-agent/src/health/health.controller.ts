import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('ready')
  getReadiness() {
    return this.healthService.getReadinessStatus();
  }

  @Get('live')
  getLiveness() {
    return this.healthService.getLivenessStatus();
  }
}