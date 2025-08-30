import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return health status with correct structure', () => {
      const result = service.getHealthStatus();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service', 'agent-api');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getHealthStatus();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('getReadinessStatus', () => {
    it('should return readiness status with correct structure', () => {
      const result = service.getReadinessStatus();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database', 'ok');
      
      expect(['ready', 'not ready']).toContain(result.status);
      expect(typeof result.timestamp).toBe('string');
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getReadinessStatus();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('getLivenessStatus', () => {
    it('should return liveness status with correct structure', () => {
      const result = service.getLivenessStatus();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('pid');
      expect(result).toHaveProperty('memory');
      
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.pid).toBe('number');
      expect(typeof result.memory).toBe('object');
      expect(result.pid).toBe(process.pid);
    });

    it('should return valid memory usage object', () => {
      const result = service.getLivenessStatus();
      const memoryKeys = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'];
      
      memoryKeys.forEach(key => {
        expect(result.memory).toHaveProperty(key);
        expect(typeof result.memory[key]).toBe('number');
      });
    });

    it('should return valid ISO timestamp', () => {
      const result = service.getLivenessStatus();
      const timestamp = new Date(result.timestamp);
      
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });
});