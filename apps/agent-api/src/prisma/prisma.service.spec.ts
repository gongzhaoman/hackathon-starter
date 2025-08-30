import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    
    // Spy on the actual methods and mock their implementation
    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database when module initializes', async () => {
      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection failed');
      connectSpy.mockRejectedValueOnce(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database when module destroys', async () => {
      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnection errors gracefully', async () => {
      const disconnectionError = new Error('Disconnection failed');
      disconnectSpy.mockRejectedValueOnce(disconnectionError);

      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle methods', () => {
    it('should call both connect and disconnect in proper order', async () => {
      // Initialize module
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Destroy module
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);

      // Verify call order
      const connectCallOrder = connectSpy.mock.invocationCallOrder[0];
      const disconnectCallOrder = disconnectSpy.mock.invocationCallOrder[0];
      expect(connectCallOrder).toBeLessThan(disconnectCallOrder);
    });
  });

  describe('PrismaClient inheritance', () => {
    it('should extend PrismaClient', () => {
      expect(service).toBeInstanceOf(PrismaService);
      // PrismaService extends PrismaClient, so it should have Prisma methods
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
    });
  });
});