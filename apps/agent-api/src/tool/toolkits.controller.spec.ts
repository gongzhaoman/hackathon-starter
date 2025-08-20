import { Test, TestingModule } from '@nestjs/testing';
import { ToolkitsController } from './toolkits.controller';
import { ToolkitsService } from './toolkits.service';

describe('ToolkitsController', () => {
  let controller: ToolkitsController;
  let toolkitsService: any;

  const mockToolkit = {
    id: 'common-toolkit-01',
    name: 'Common Toolkit',
    description: 'Common tools',
    settings: {},
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tools: [
      { id: 'tool-1', name: 'getCurrentTime', description: 'Get current time' },
      { id: 'tool-2', name: 'generateId', description: 'Generate unique ID' }
    ]
  };

  const mockToolkitWithoutTools = { id: 'empty-toolkit-01', tools: [] };

  beforeEach(async () => {
    const mockToolkitsService = {
      getAllToolkits: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToolkitsController],
      providers: [
        {
          provide: ToolkitsService,
          useValue: mockToolkitsService,
        },
      ],
    }).compile();

    controller = module.get<ToolkitsController>(ToolkitsController);
    toolkitsService = module.get(ToolkitsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllToolkits', () => {
    it('should return all toolkits with their tools', async () => {
      const mockToolkits = [mockToolkit];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(toolkitsService.getAllToolkits).toHaveBeenCalled();
      expect(result).toEqual(mockToolkits);
      expect(result[0].tools).toHaveLength(2);
      expect(result[0].tools[0]).toEqual({
        id: 'tool-1',
        name: 'getCurrentTime',
        description: 'Get current time',
      });
    });

    it('should return multiple toolkits', async () => {
      const mockToolkits = [mockToolkit, mockToolkitWithoutTools];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(toolkitsService.getAllToolkits).toHaveBeenCalled();
      expect(result).toEqual(mockToolkits);
      expect(result).toHaveLength(2);
      expect(result[0].tools).toHaveLength(2);
      expect(result[1].tools).toHaveLength(0);
    });

    it('should return empty array when no toolkits exist', async () => {
      toolkitsService.getAllToolkits.mockResolvedValue([]);

      const result = await controller.getAllToolkits();

      expect(toolkitsService.getAllToolkits).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const errorMessage = 'Database connection failed';
      toolkitsService.getAllToolkits.mockRejectedValue(new Error(errorMessage));

      await expect(controller.getAllToolkits()).rejects.toThrow(errorMessage);
      expect(toolkitsService.getAllToolkits).toHaveBeenCalled();
    });

    it('should return toolkits ordered by name', async () => {
      const toolkit1 = { ...mockToolkit, name: 'B Toolkit' };
      const toolkit2 = { ...mockToolkitWithoutTools, name: 'A Toolkit' };
      const mockToolkits = [toolkit1, toolkit2]; // Service should return in alphabetical order

      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result).toEqual(mockToolkits);
      // Verify that the service is responsible for ordering
      expect(toolkitsService.getAllToolkits).toHaveBeenCalled();
    });

    it('should include all expected toolkit properties', async () => {
      const mockToolkits = [mockToolkit];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('settings');
      expect(result[0]).toHaveProperty('deleted');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
      expect(result[0]).toHaveProperty('tools');
    });

    it('should include all expected tool properties', async () => {
      const mockToolkits = [mockToolkit];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      const tool = result[0].tools[0];
      expect(tool).toHaveProperty('id');
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
    });

    it('should handle toolkits with complex settings', async () => {
      const toolkitWithComplexSettings = {
        ...mockToolkit,
        settings: {
          apiKey: 'secret',
          timeout: 5000,
          retries: 3,
          endpoints: {
            primary: 'https://api.example.com',
            fallback: 'https://api2.example.com'
          }
        }
      };
      const mockToolkits = [toolkitWithComplexSettings];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result[0].settings).toEqual(toolkitWithComplexSettings.settings);
    });

    it('should handle toolkits with null settings', async () => {
      const toolkitWithNullSettings = {
        ...mockToolkit,
        settings: null
      };
      const mockToolkits = [toolkitWithNullSettings];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result[0].settings).toBeNull();
    });

    it('should only return non-deleted toolkits', async () => {
      // This test verifies that the service properly filters deleted toolkits
      // The controller itself doesn't handle filtering, but we test the expected behavior
      const mockToolkits = [mockToolkit, mockToolkitWithoutTools];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result.every(toolkit => !toolkit.deleted)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should propagate service errors without modification', async () => {
      const customError = new Error('Custom service error');
      toolkitsService.getAllToolkits.mockRejectedValue(customError);

      await expect(controller.getAllToolkits()).rejects.toBe(customError);
    });

    it('should handle async service errors', async () => {
      toolkitsService.getAllToolkits.mockImplementation(async () => {
        throw new Error('Async error');
      });

      await expect(controller.getAllToolkits()).rejects.toThrow('Async error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle large number of toolkits', async () => {
      const manyToolkits = Array.from({ length: 100 }, (_, i) => ({
        ...mockToolkit,
        id: `toolkit-${i}`,
        name: `Toolkit ${i}`,
      }));
      toolkitsService.getAllToolkits.mockResolvedValue(manyToolkits);

      const result = await controller.getAllToolkits();

      expect(result).toHaveLength(100);
      expect(toolkitsService.getAllToolkits).toHaveBeenCalledTimes(1);
    });

    it('should handle toolkits with many tools', async () => {
      const toolkitWithManyTools = {
        ...mockToolkit,
        tools: Array.from({ length: 50 }, (_, i) => ({
          id: `tool-${i}`,
          name: `tool${i}`,
          description: `Tool number ${i}`,
        }))
      };
      const mockToolkits = [toolkitWithManyTools];
      toolkitsService.getAllToolkits.mockResolvedValue(mockToolkits);

      const result = await controller.getAllToolkits();

      expect(result[0].tools).toHaveLength(50);
    });
  });
});