import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlamaindexService } from '../llamaindex/llamaindex.service';
import { ToolsService } from '../tool/tools.service';
import { MockPrismaService, MockLlamaindxService, MockToolsService } from '../test-setup';

describe('AgentService', () => {
  let service: AgentService;
  let prismaService: MockPrismaService;
  let llamaindexService: MockLlamaindxService;
  let toolsService: MockToolsService;

  beforeEach(async () => {
    const mockServices = global.createMockServices();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: mockServices.prisma },
        { provide: LlamaindexService, useValue: mockServices.llamaindex },
        { provide: ToolsService, useValue: mockServices.tools },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    prismaService = module.get<MockPrismaService>(PrismaService);
    llamaindexService = module.get<MockLlamaindxService>(LlamaindexService);
    toolsService = module.get<MockToolsService>(ToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test Description',
          prompt: 'You are a test agent',
          options: { temperature: 0.7 },
          createdById: 'test-user',
          deleted: false,
          isWorkflowGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          agentToolkits: [],
          agentKnowledgeBases: [],
          agentTools: [],
        },
      ];

      (prismaService.agent.findMany as jest.Mock).mockResolvedValue(mockAgents);

      const result = await service.findAll();

      expect(prismaService.agent.findMany).toHaveBeenCalledWith({
        where: {
          deleted: false,
          isWorkflowGenerated: false,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockAgents);
    });
  });

  describe('findOne', () => {
    it('should return an agent by id', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        description: 'Test Description',
        prompt: 'You are a test agent',
        options: { temperature: 0.7 },
        createdById: 'test-user',
        deleted: false,
        isWorkflowGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentToolkits: [],
        agentKnowledgeBases: [],
        agentTools: [],
      };

      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);

      const result = await service.findOne('agent-1');

      expect(prismaService.agent.findUnique).toHaveBeenCalledWith({
        where: { id: 'agent-1', deleted: false },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException when agent is not found', async () => {
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('create', () => {
    it('should create an agent', async () => {
      const createAgentDto = {
        name: 'New Agent',
        description: 'New Description',
        prompt: 'You are a new agent',
        options: { temperature: 0.8 },
        createdById: 'user-1'
      };

      const mockCreatedAgent = {
        id: 'new-agent-id',
        ...createAgentDto,
        deleted: false,
        isWorkflowGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentToolkits: [],
        agentKnowledgeBases: [],
        agentTools: []
      };

      (prismaService.agent.create as jest.Mock).mockResolvedValue(mockCreatedAgent);

      const result = await service.create(createAgentDto);

      expect(prismaService.agent.create).toHaveBeenCalledWith({
        data: {
          name: createAgentDto.name,
          description: createAgentDto.description,
          prompt: createAgentDto.prompt,
          options: createAgentDto.options,
        },
      });
      expect(result).toEqual(mockCreatedAgent);
    });
  });

  describe('update', () => {
    it('should update an agent', async () => {
      const updateAgentDto = {
        name: 'Updated Agent',
        description: 'Updated Description',
      };

      const mockUpdatedAgent = {
        id: 'agent-1',
        name: 'Updated Agent',
        description: 'Updated Description',
        prompt: 'You are a test agent',
        options: { temperature: 0.7 },
        createdById: 'test-user',
        deleted: false,
        isWorkflowGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        agentToolkits: [],
        agentKnowledgeBases: [],
        agentTools: []
      };

      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockUpdatedAgent);
      (prismaService.agent.update as jest.Mock).mockResolvedValue(mockUpdatedAgent);

      const result = await service.update('agent-1', updateAgentDto);

      expect(prismaService.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: {
          ...updateAgentDto,
          options: undefined,
          prompt: undefined,
        },
      });
      expect(result).toEqual(mockUpdatedAgent);
    });

    it('should throw NotFoundException when agent is not found', async () => {
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('non-existent', {})).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an agent', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        deleted: false,
      };

      const mockDeletedAgent = { ...mockAgent, deleted: true };

      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.agent.update as jest.Mock).mockResolvedValue(mockDeletedAgent);

      const result = await service.remove('agent-1');

      expect(prismaService.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
        data: { deleted: true },
      });
      expect(result).toEqual(mockDeletedAgent);
    });

    it('should throw NotFoundException when agent is not found', async () => {
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('chatWithAgent', () => {
    it('should execute chat with agent', async () => {
      const chatDto = {
        message: 'Hello',
        sessionId: 'session-1',
      };

      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        prompt: 'You are a test agent',
        options: { temperature: 0.7 },
      };

      const mockTools = [{ name: 'tool1' }];
      const mockAgentInstance = {
        run: jest.fn().mockResolvedValue({
          data: { result: 'Hello! How can I help you?' },
        }),
      };

      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (toolsService.getAgentTools as jest.Mock).mockResolvedValue(mockTools);
      (llamaindexService.createAgent as jest.Mock).mockResolvedValue(mockAgentInstance);

      const result = await service.chatWithAgent('agent-1', chatDto);

      expect(toolsService.getAgentTools).toHaveBeenCalledWith('agent-1');
      expect(llamaindexService.createAgent).toHaveBeenCalledWith(
        mockTools,
        mockAgent.prompt,
      );
      expect(result).toEqual({
        agentId: 'agent-1',
        agentName: 'Test Agent',
        context: {},
        response: 'Hello! How can I help you?',
        timestamp: expect.any(String),
        userMessage: 'Hello',
      });
    });

    it('should throw NotFoundException when agent is not found', async () => {
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.chatWithAgent('non-existent', { message: 'Hello' })).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });
});
