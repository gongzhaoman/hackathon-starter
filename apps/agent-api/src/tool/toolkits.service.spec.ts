import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ToolkitsService } from './toolkits.service';
import { PrismaService } from '../prisma/prisma.service';
import { Toolkit } from './interface/toolkit';
import { TOOLKIT_ID_KEY } from './toolkits.decorator';
import { MockPrismaService } from '../test-setup';

describe('ToolkitsService', () => {
  let service: ToolkitsService;
  let discoveryService: any;
  let reflector: any;
  let prismaService: MockPrismaService;
  let moduleRef: any;

  const mockToolkit = {
    id: 'common-toolkit-01',
    name: 'Common Toolkit',
    description: 'Common tools',
    settings: {},
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTool = {
    id: 'tool-1',
    name: 'getCurrentTime',
    description: 'Get current time',
    schema: { timezone: 'string' },
    toolkitId: 'common-toolkit-01',
  };

  const mockToolInstance = {
    metadata: {
      name: 'getCurrentTime',
      description: 'Get current time',
      parameters: { timezone: 'string' }
    },
    call: jest.fn()
  };

  class MockToolkitClass {
    id = 'common-toolkit-01';
    name = 'Common Toolkit';
    description = 'Common tools';
    settings = {};
    tools = []; // Add the required tools property

    async getTools() {
      return [mockToolInstance];
    }

    async applySettings(settings: Record<string, any>) {
      this.settings = settings;
    }
  }

  const mockAgentToolkit = {
    agentId: 'agent-1',
    toolkitId: 'common-toolkit-01',
    settings: { agentId: 'agent-1', timezone: 'UTC' },
    toolkit: mockToolkit,
  };

  beforeEach(async () => {
    const mockServices = global.createMockServices();
    
    const mockDiscoveryService = {
      getProviders: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const mockModuleRef = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolkitsService,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PrismaService,
          useValue: mockServices.prisma,
        },
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
      ],
    }).compile();

    service = module.get<ToolkitsService>(ToolkitsService);
    discoveryService = module.get(DiscoveryService);
    reflector = module.get(Reflector);
    prismaService = module.get<MockPrismaService>(PrismaService);
    moduleRef = module.get(ModuleRef);

  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should discover and sync toolkits on module init', async () => {
      const mockWrapper = {
        metatype: MockToolkitClass as any,
      };

      discoveryService.getProviders.mockReturnValue([mockWrapper]);
      reflector.get.mockReturnValue('common-toolkit-01');
      moduleRef.get.mockReturnValue(new MockToolkitClass());
      prismaService.toolkit.findUnique.mockResolvedValue(null);
      prismaService.toolkit.upsert.mockResolvedValue(mockToolkit);
      prismaService.tool.upsert.mockResolvedValue(mockTool);
      prismaService.tool.findMany.mockResolvedValue([]);
      prismaService.toolkit.findMany.mockResolvedValue([]);

      await service.onModuleInit();

      expect(discoveryService.getProviders).toHaveBeenCalled();
      expect(reflector.get).toHaveBeenCalledWith(TOOLKIT_ID_KEY, MockToolkitClass as any);
      expect(prismaService.toolkit.upsert).toHaveBeenCalled();
      expect(prismaService.tool.upsert).toHaveBeenCalled();
    });

    it('should throw error for duplicate toolkit IDs', async () => {
      const mockWrapper1 = { metatype: MockToolkitClass } as any;
      const mockWrapper2 = { metatype: MockToolkitClass } as any;

      discoveryService.getProviders.mockReturnValue([mockWrapper1, mockWrapper2]);
      reflector.get.mockReturnValue('common-toolkit-01');

      await expect(service.onModuleInit()).rejects.toThrow(
        'Toolkit with ID common-toolkit-01 is already registered.'
      );
    });

    it('should skip providers without metatype', async () => {
      const mockWrapper = { metatype: null };

      discoveryService.getProviders.mockReturnValue([mockWrapper]);
      prismaService.toolkit.findMany.mockResolvedValue([]);

      await service.onModuleInit();

      expect(reflector.get).not.toHaveBeenCalled();
    });

    it('should skip providers without toolkit ID', async () => {
      const mockWrapper = { metatype: MockToolkitClass } as any;

      discoveryService.getProviders.mockReturnValue([mockWrapper]);
      reflector.get.mockReturnValue(null);
      prismaService.toolkit.findMany.mockResolvedValue([]);

      await service.onModuleInit();

      expect(moduleRef.get).not.toHaveBeenCalled();
    });
  });

  describe('getToolkitInstance', () => {
    beforeEach(() => {
      // Setup discovered toolkit
      service['toolkitMap'].set('common-toolkit-01', MockToolkitClass as any);
    });

    it('should return toolkit instance with applied settings', async () => {
      const settings = { timezone: 'UTC' };
      const mockInstance = new MockToolkitClass();

      moduleRef.get.mockReturnValue(mockInstance);

      const result = await service.getToolkitInstance('common-toolkit-01', settings);

      expect(moduleRef.get).toHaveBeenCalledWith(MockToolkitClass as any);
      expect(result.settings).toEqual(settings);
    });

    it('should throw error for unknown toolkit type', async () => {
      await expect(service.getToolkitInstance('unknown-toolkit', {})).rejects.toThrow(
        'Unknown toolkit type: unknown-toolkit'
      );
    });
  });

  describe('getAgentToolkitInstances', () => {
    beforeEach(() => {
      service['toolkitMap'].set('common-toolkit-01', MockToolkitClass as any);
    });

    it('should return agent toolkit instances', async () => {
      const agentId = 'agent-1';
      const mockInstance = new MockToolkitClass();

      prismaService.agentToolkit.findMany.mockResolvedValue([mockAgentToolkit]);
      moduleRef.get.mockReturnValue(mockInstance);

      const result = await service.getAgentToolkitInstances(agentId);

      expect(prismaService.agentToolkit.findMany).toHaveBeenCalledWith({
        where: { agentId },
        include: { toolkit: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(MockToolkitClass);
    });

    it('should return empty array for agent with no toolkits', async () => {
      const agentId = 'agent-no-toolkits';

      prismaService.agentToolkit.findMany.mockResolvedValue([]);

      const result = await service.getAgentToolkitInstances(agentId);

      expect(result).toEqual([]);
    });
  });

  describe('getAllToolkits', () => {
    it('should return all non-deleted toolkits with tools', async () => {
      const mockToolkitWithTools = {
        ...mockToolkit,
        tools: [
          {
            id: 'tool-1',
            name: 'getCurrentTime',
            description: 'Get current time',
          },
        ],
      };

      prismaService.toolkit.findMany.mockResolvedValue([mockToolkitWithTools]);

      const result = await service.getAllToolkits();

      expect(prismaService.toolkit.findMany).toHaveBeenCalledWith({
        where: { 
          deleted: false,
          type: 'BUSINESS'
        },
        include: {
          tools: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      expect(result).toEqual([mockToolkitWithTools]);
    });
  });

  describe('getAgentToolkits', () => {
    it('should return agent toolkits', async () => {
      const agentId = 'agent-1';

      prismaService.agentToolkit.findMany.mockResolvedValue([mockAgentToolkit]);

      const result = await service.getAgentToolkits(agentId);

      expect(prismaService.agentToolkit.findMany).toHaveBeenCalledWith({
        where: { agentId },
        include: { toolkit: true },
      });
      expect(result).toEqual([mockAgentToolkit]);
    });
  });

  describe('addToolkitToAgent', () => {
    it('should add toolkit to agent with settings', async () => {
      const agentId = 'agent-1';
      const toolkitId = 'common-toolkit-01';
      const settings = { timezone: 'UTC' };
      const expectedSettings = { ...settings, agentId };

      const createdAgentToolkit = {
        ...mockAgentToolkit,
        settings: expectedSettings,
      };

      prismaService.agentToolkit.create.mockResolvedValue(createdAgentToolkit);

      const result = await service.addToolkitToAgent(agentId, toolkitId, settings);

      expect(prismaService.agentToolkit.create).toHaveBeenCalledWith({
        data: {
          agent: { connect: { id: agentId } },
          toolkit: { connect: { id: toolkitId } },
          settings: expectedSettings,
        },
      });
      expect(result.settings).not.toHaveProperty('agentId');
    });
  });

  describe('removeToolkitFromAgent', () => {
    it('should remove toolkit from agent', async () => {
      const agentId = 'agent-1';
      const toolkitId = 'common-toolkit-01';

      prismaService.agentToolkit.delete.mockResolvedValue(mockAgentToolkit);

      const result = await service.removeToolkitFromAgent(agentId, toolkitId);

      expect(prismaService.agentToolkit.delete).toHaveBeenCalledWith({
        where: {
          agentId_toolkitId: {
            agentId,
            toolkitId,
          },
        },
      });
      expect(result).toEqual(mockAgentToolkit);
    });
  });

  describe('applyAgentToolkitSettings', () => {
    it('should update agent toolkit settings', async () => {
      const agentId = 'agent-1';
      const toolkitId = 'common-toolkit-01';
      const newSettings = { timezone: 'Asia/Shanghai' };
      const updatedSettings = { ...newSettings, agentId };

      prismaService.agentToolkit.findUnique.mockResolvedValue(mockAgentToolkit);
      prismaService.agentToolkit.update.mockResolvedValue({
        ...mockAgentToolkit,
        settings: updatedSettings,
      });

      const result = await service.applyAgentToolkitSettings(agentId, toolkitId, newSettings);

      expect(prismaService.agentToolkit.update).toHaveBeenCalledWith({
        where: {
          agentId_toolkitId: {
            agentId,
            toolkitId,
          },
        },
        data: { settings: updatedSettings },
      });
      expect(result.settings).toEqual(updatedSettings);
    });

    it('should preserve agentId from existing settings', async () => {
      const agentId = 'agent-1';
      const toolkitId = 'common-toolkit-01';
      const newSettings = { timezone: 'Asia/Shanghai' };

      prismaService.agentToolkit.findUnique.mockResolvedValue({
        ...mockAgentToolkit,
        settings: { agentId: 'original-agent', timezone: 'UTC' },
      });

      await service.applyAgentToolkitSettings(agentId, toolkitId, newSettings);

      expect(prismaService.agentToolkit.update).toHaveBeenCalledWith({
        where: {
          agentId_toolkitId: {
            agentId,
            toolkitId,
          },
        },
        data: { 
          settings: { 
            ...newSettings, 
            agentId: 'original-agent' 
          } 
        },
      });
    });
  });

  describe('filterSensitiveSettings', () => {
    it('should filter agentId from AgentToolkit settings', () => {
      const toolkitWithSensitiveData = {
        ...mockAgentToolkit,
        settings: { agentId: 'agent-1', timezone: 'UTC', apiKey: 'secret' },
      };

      const result = service.filterSensitiveSettings(toolkitWithSensitiveData);

      expect(result.settings).not.toHaveProperty('agentId');
      expect(result.settings).toEqual({ timezone: 'UTC', apiKey: 'secret' });
    });

    it('should filter agentId from Toolkit settings', () => {
      const toolkitWithSensitiveData = {
        id: 'toolkit-1',
        name: 'Test Toolkit',
        settings: { agentId: 'agent-1', timezone: 'UTC' },
      };

      const result = service.filterSensitiveSettings(toolkitWithSensitiveData);

      expect(result.settings).not.toHaveProperty('agentId');
      expect(result.settings).toEqual({ timezone: 'UTC' });
    });

    it('should return unchanged if no settings', () => {
      const toolkitWithoutSettings = {
        id: 'toolkit-1',
        name: 'Test Toolkit',
      };

      const result = service.filterSensitiveSettings(toolkitWithoutSettings);

      expect(result).toEqual(toolkitWithoutSettings);
    });

    it('should return unchanged if null/undefined', () => {
      expect(service.filterSensitiveSettings(null)).toBeNull();
      expect(service.filterSensitiveSettings(undefined)).toBeUndefined();
    });
  });
});