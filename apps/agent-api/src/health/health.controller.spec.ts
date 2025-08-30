import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import type { DataResponse } from '../common/types/api-response.types';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  const mockHealthStatus = {
    status: 'ok',
    timestamp: '2023-01-01T00:00:00.000Z',
    service: 'agent-api',
    version: '1.0.0',
    uptime: 123.45,
    environment: 'test',
  };

  const mockReadinessStatus = {
    status: 'ready',
    timestamp: '2023-01-01T00:00:00.000Z',
    checks: {
      database: 'ok',
    },
  };

  const mockLivenessStatus = {
    status: 'alive',
    timestamp: '2023-01-01T00:00:00.000Z',
    pid: 12345,
    memory: {
      rss: 1000000,
      heapTotal: 2000000,
      heapUsed: 1500000,
      external: 100000,
      arrayBuffers: 50000,
    },
  };

  beforeEach(async () => {
    const mockHealthService = {
      getHealthStatus: jest.fn(),
      getReadinessStatus: jest.fn(),
      getLivenessStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService) as jest.Mocked<HealthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status wrapped in response builder', () => {
      healthService.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = controller.getHealth();

      expect(healthService.getHealthStatus).toHaveBeenCalledTimes(1);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockHealthStatus);
      expect((result as DataResponse<any>).message).toBe('服务状态正常');
    });

    it('should call health service getHealthStatus method', () => {
      healthService.getHealthStatus.mockReturnValue(mockHealthStatus);

      controller.getHealth();

      expect(healthService.getHealthStatus).toHaveBeenCalledWith();
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status wrapped in response builder', () => {
      healthService.getReadinessStatus.mockReturnValue(mockReadinessStatus);

      const result = controller.getReadiness();

      expect(healthService.getReadinessStatus).toHaveBeenCalledTimes(1);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockReadinessStatus);
      expect((result as DataResponse<any>).message).toBe('服务就绪');
    });

    it('should call health service getReadinessStatus method', () => {
      healthService.getReadinessStatus.mockReturnValue(mockReadinessStatus);

      controller.getReadiness();

      expect(healthService.getReadinessStatus).toHaveBeenCalledWith();
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status wrapped in response builder', () => {
      healthService.getLivenessStatus.mockReturnValue(mockLivenessStatus);

      const result = controller.getLiveness();

      expect(healthService.getLivenessStatus).toHaveBeenCalledTimes(1);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockLivenessStatus);
      expect((result as DataResponse<any>).message).toBe('服务存活');
    });

    it('should call health service getLivenessStatus method', () => {
      healthService.getLivenessStatus.mockReturnValue(mockLivenessStatus);

      controller.getLiveness();

      expect(healthService.getLivenessStatus).toHaveBeenCalledWith();
    });
  });
});