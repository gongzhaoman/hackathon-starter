import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, Logger } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolkitsService } from './toolkits.service';
import { PrismaService } from '../prisma/prisma.service';
import { MockPrismaService } from '../test-setup';

describe('ToolsService', () => {
  let service: ToolsService;
  let toolkitsService: any;
  let prismaService: any;

  const mockTool = {
    name: 'getCurrentTime',
    toolkitId: 'common-toolkit-01',
    toolkit: { name: 'Common Toolkit', settings: {} }
  };

  const mockToolInstance = {
    metadata: { name: 'getCurrentTime' },
    call: jest.fn()
  };

  const mockToolkitInstance = {
    getTools: jest.fn().mockResolvedValue([mockToolInstance]),
    applySettings: jest.fn()
  };

  beforeEach(async () => {
    const mockToolkitsService = {
      getAgentToolkitInstances: jest.fn(),
      getToolkitInstance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        { provide: ToolkitsService, useValue: mockToolkitsService },
        { provide: PrismaService, useValue: { tool: { findUnique: jest.fn() } } },
      ],
    }).compile();

    service = module.get<ToolsService>(ToolsService);
    toolkitsService = module.get(ToolkitsService);
    prismaService = module.get(PrismaService);

  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAgentTools', () => {
    it('should return all tools from agent toolkits', async () => {
      const agentId = 'agent-1';
      const mockToolkitInstances = [mockToolkitInstance];

      toolkitsService.getAgentToolkitInstances.mockResolvedValue(mockToolkitInstances);

      const result = await service.getAgentTools(agentId);

      expect(toolkitsService.getAgentToolkitInstances).toHaveBeenCalledWith(agentId);
      expect(mockToolkitInstance.getTools).toHaveBeenCalled();
      expect(result).toEqual([mockToolInstance]);
    });

    it('should return empty array when agent has no toolkits', async () => {
      const agentId = 'agent-with-no-toolkits';

      toolkitsService.getAgentToolkitInstances.mockResolvedValue([]);

      const result = await service.getAgentTools(agentId);

      expect(result).toEqual([]);
    });

    it('should combine tools from multiple toolkits', async () => {
      const agentId = 'agent-1';
      const mockToolInstance2 = {
        metadata: {
          name: 'generateId',
          description: 'Generate unique ID',
          parameters: {}
        },
        call: jest.fn()
      };

      const mockToolkitInstance2 = {
        ...mockToolkitInstance,
        id: 'utils-toolkit-01',
        name: 'Utils Toolkit',
        getTools: jest.fn().mockResolvedValue([mockToolInstance2])
      };

      const mockToolkitInstances = [mockToolkitInstance, mockToolkitInstance2];

      toolkitsService.getAgentToolkitInstances.mockResolvedValue(mockToolkitInstances);

      const result = await service.getAgentTools(agentId);

      expect(result).toHaveLength(2);
      expect(result).toContain(mockToolInstance);
      expect(result).toContain(mockToolInstance2);
    });
  });

  describe('getToolByName', () => {
    it('should return tool instance by name', async () => {
      const toolName = 'getCurrentTime';

      prismaService.tool.findUnique.mockResolvedValue(mockTool);
      toolkitsService.getToolkitInstance.mockResolvedValue(mockToolkitInstance);

      const result = await service.getToolByName(toolName);

      expect(prismaService.tool.findUnique).toHaveBeenCalledWith({
        where: { name: toolName },
        include: { toolkit: true },
      });
      expect(toolkitsService.getToolkitInstance).toHaveBeenCalledWith(
        mockTool.toolkitId,
        mockTool.toolkit.settings
      );
      expect(result).toEqual(mockToolInstance);
    });

    it('should use provided toolkit settings', async () => {
      const toolName = 'getCurrentTime';
      const customSettings = { timezone: 'UTC' };

      prismaService.tool.findUnique.mockResolvedValue(mockTool);
      toolkitsService.getToolkitInstance.mockResolvedValue(mockToolkitInstance);

      const result = await service.getToolByName(toolName, customSettings);

      expect(toolkitsService.getToolkitInstance).toHaveBeenCalledWith(
        mockTool.toolkitId,
        customSettings
      );
      expect(result).toEqual(mockToolInstance);
    });

    it('should throw NotFoundException when tool is not found in database', async () => {
      const toolName = 'nonExistentTool';

      prismaService.tool.findUnique.mockResolvedValue(null);

      await expect(service.getToolByName(toolName)).rejects.toThrow(
        new NotFoundException(`Tool ${toolName} not found`)
      );
    });

    it('should throw NotFoundException when tool is not found in toolkit', async () => {
      const toolName = 'getCurrentTime';
      const toolkitInstanceWithoutTool = {
        ...mockToolkitInstance,
        getTools: jest.fn().mockResolvedValue([])
      };

      prismaService.tool.findUnique.mockResolvedValue(mockTool);
      toolkitsService.getToolkitInstance.mockResolvedValue(toolkitInstanceWithoutTool);

      await expect(service.getToolByName(toolName)).rejects.toThrow(
        new NotFoundException(
          `Tool ${toolName} not found in toolkit ${mockTool.toolkit.name}`
        )
      );
    });

    it('should handle tool with different metadata name', async () => {
      const toolName = 'getCurrentTime';
      const toolInstanceWithDifferentName = {
        ...mockToolInstance,
        metadata: {
          ...mockToolInstance.metadata,
          name: 'differentName'
        }
      };
      const toolkitInstanceWithDifferentTool = {
        ...mockToolkitInstance,
        getTools: jest.fn().mockResolvedValue([toolInstanceWithDifferentName])
      };

      prismaService.tool.findUnique.mockResolvedValue(mockTool);
      toolkitsService.getToolkitInstance.mockResolvedValue(toolkitInstanceWithDifferentTool);

      await expect(service.getToolByName(toolName)).rejects.toThrow(
        new NotFoundException(
          `Tool ${toolName} not found in toolkit ${mockTool.toolkit.name}`
        )
      );
    });

    it('should handle toolkit with multiple tools and find the correct one', async () => {
      const toolName = 'getCurrentTime';
      const otherToolInstance = {
        metadata: {
          name: 'generateId',
          description: 'Generate ID',
          parameters: {}
        },
        call: jest.fn()
      };
      const toolkitInstanceWithMultipleTools = {
        ...mockToolkitInstance,
        getTools: jest.fn().mockResolvedValue([otherToolInstance, mockToolInstance])
      };

      prismaService.tool.findUnique.mockResolvedValue(mockTool);
      toolkitsService.getToolkitInstance.mockResolvedValue(toolkitInstanceWithMultipleTools);

      const result = await service.getToolByName(toolName);

      expect(result).toEqual(mockToolInstance);
    });

    it('should use empty object as default settings when toolkit has no settings', async () => {
      const toolName = 'getCurrentTime';
      const toolWithoutSettings = {
        ...mockTool,
        toolkit: {
          ...mockTool.toolkit,
          settings: null
        }
      };

      prismaService.tool.findUnique.mockResolvedValue(toolWithoutSettings);
      toolkitsService.getToolkitInstance.mockResolvedValue(mockToolkitInstance);

      const result = await service.getToolByName(toolName);

      expect(toolkitsService.getToolkitInstance).toHaveBeenCalledWith(
        mockTool.toolkitId,
        {}
      );
      expect(result).toEqual(mockToolInstance);
    });
  });
});