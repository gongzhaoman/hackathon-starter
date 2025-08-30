import { Test, TestingModule } from '@nestjs/testing';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';
import { NotFoundException } from '@nestjs/common';

describe('AgentController', () => {
  let controller: AgentController;
  let agentService: any;

  const mockAgent = { id: 'agent-1', name: 'Test Agent' };

  const mockAgentToolkits = [{ agentId: 'agent-1' }];

  const mockChatResponse = {
    agentId: 'agent-1',
    response: 'Hello, how can I help you?'
  };

  beforeEach(async () => {
    const mockAgentService = {
      findAll: jest.fn(),
      findOneAgent: jest.fn(),
      createAgent: jest.fn(),
      updateAgent: jest.fn(),
      removeAgent: jest.fn(),
      chatWithAgent: jest.fn(),
      getAgentToolkits: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        {
          provide: AgentService,
          useValue: mockAgentService,
        },
      ],
    }).compile();

    controller = module.get<AgentController>(AgentController);
    agentService = module.get(AgentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all agents', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const mockAgents = [mockAgent];
      agentService.findAll.mockResolvedValue(mockAgents);

      const result = await controller.findAll(mockUser as any, {});

      expect(agentService.findAll).toHaveBeenCalledWith('user-1', 'org-1');
      expect(result.data).toEqual(mockAgents);
    });

    it('should return empty array when no agents exist', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockUser as any, {});

      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single agent', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.findOneAgent.mockResolvedValue(mockAgent);

      const result = await controller.findOne(mockUser as any, 'agent-1');

      expect(agentService.findOneAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1');
      expect(result.data).toEqual(mockAgent);
    });

    it('should throw NotFoundException when agent not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.findOneAgent.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.findOne(mockUser as any, 'non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('create', () => {
    const createAgentDto: CreateAgentDto = {
      name: 'New Agent',
      description: 'New Description',
      prompt: 'You are a new agent',
      options: { temperature: 0.5 },
    };

    it('should create a new agent', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.createAgent.mockResolvedValue(createdAgent);

      const result = await controller.create(mockUser as any, createAgentDto);

      expect(agentService.createAgent).toHaveBeenCalledWith('user-1', 'org-1', createAgentDto);
      expect(result.data).toEqual(createdAgent);
    });

    it('should create agent with toolkits', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const createAgentDtoWithToolkits: CreateAgentDto = {
        ...createAgentDto,
        toolkits: [
          { toolkitId: 'toolkit-1', settings: { key: 'value' } }
        ]
      };
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.createAgent.mockResolvedValue(createdAgent);

      const result = await controller.create(mockUser as any, createAgentDtoWithToolkits);

      expect(agentService.createAgent).toHaveBeenCalledWith('user-1', 'org-1', createAgentDtoWithToolkits);
      expect(result.data).toEqual(createdAgent);
    });

    it('should create agent with knowledge bases', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const createAgentDtoWithKB: CreateAgentDto = {
        ...createAgentDto,
        knowledgeBases: ['kb-1', 'kb-2']
      };
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.createAgent.mockResolvedValue(createdAgent);

      const result = await controller.create(mockUser as any, createAgentDtoWithKB);

      expect(agentService.createAgent).toHaveBeenCalledWith('user-1', 'org-1', createAgentDtoWithKB);
      expect(result.data).toEqual(createdAgent);
    });
  });

  describe('update', () => {
    const updateAgentDto: UpdateAgentDto = {
      name: 'Updated Agent',
      description: 'Updated Description',
    };

    it('should update an agent', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const updatedAgent = { ...mockAgent, ...updateAgentDto };
      agentService.updateAgent.mockResolvedValue(updatedAgent);

      const result = await controller.update(mockUser as any, 'agent-1', updateAgentDto);

      expect(agentService.updateAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', updateAgentDto);
      expect(result.data).toEqual(updatedAgent);
    });

    it('should update agent with new toolkits', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const updateAgentDtoWithToolkits: UpdateAgentDto = {
        ...updateAgentDto,
        toolkits: [
          { toolkitId: 'new-toolkit', settings: {} }
        ]
      };
      const updatedAgent = { ...mockAgent, ...updateAgentDto };
      agentService.updateAgent.mockResolvedValue(updatedAgent);

      const result = await controller.update(mockUser as any, 'agent-1', updateAgentDtoWithToolkits);

      expect(agentService.updateAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', updateAgentDtoWithToolkits);
      expect(result.data).toEqual(updatedAgent);
    });

    it('should throw NotFoundException when agent not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.updateAgent.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.update(mockUser as any, 'non-existent', updateAgentDto)).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an agent', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const deletedAgent = { ...mockAgent, deleted: true };
      agentService.removeAgent.mockResolvedValue(deletedAgent);

      const result = await controller.remove(mockUser as any, 'agent-1');

      expect(agentService.removeAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1');
      expect(result.result.resourceId).toEqual("agent-1");
    });

    it('should throw NotFoundException when agent not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.removeAgent.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.remove(mockUser as any, 'non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('chat', () => {
    const chatDto: ChatWithAgentDto = {
      message: 'Hello, agent!',
      context: { sessionId: 'test-session' },
    };

    it('should chat with agent', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.chatWithAgent.mockResolvedValue(mockChatResponse);

      const result = await controller.chat(mockUser as any, 'agent-1', chatDto);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', chatDto);
      expect(result.data).toEqual(mockChatResponse);
    });

    it('should chat with agent without context', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const chatDtoWithoutContext: ChatWithAgentDto = {
        message: 'Hello, agent!',
      };
      const responseWithoutContext = {
        ...mockChatResponse,
        context: {}
      };

      agentService.chatWithAgent.mockResolvedValue(responseWithoutContext);

      const result = await controller.chat(mockUser as any, 'agent-1', chatDtoWithoutContext);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', chatDtoWithoutContext);
      expect(result.data).toEqual(responseWithoutContext);
    });

    it('should throw NotFoundException when agent not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.chatWithAgent.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.chat(mockUser as any, 'non-existent', chatDto)).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('getAgentToolkits', () => {
    it('should return agent toolkits', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.getAgentToolkits.mockResolvedValue(mockAgentToolkits);

      const result = await controller.getAgentToolkits(mockUser as any, 'agent-1');

      expect(agentService.getAgentToolkits).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1');
      expect(result.data).toEqual(mockAgentToolkits);
    });

    it('should return empty array when agent has no toolkits', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.getAgentToolkits.mockResolvedValue([]);

      const result = await controller.getAgentToolkits(mockUser as any, 'agent-1');

      expect(result.data).toEqual([]);
    });

    it('should throw NotFoundException when agent not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      agentService.getAgentToolkits.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.getAgentToolkits(mockUser as any, 'non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const errorMessage = 'Database connection failed';
      agentService.findAll.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll(mockUser as any, {})).rejects.toThrow(errorMessage);
    });

    it('should handle validation errors from service', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const createAgentDto: CreateAgentDto = {
        name: '',
        prompt: 'Invalid agent',
      };

      agentService.createAgent.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create(mockUser as any, createAgentDto)).rejects.toThrow('Validation failed');
    });
  });

  describe('input validation', () => {
    it('should accept valid CreateAgentDto', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const validDto: CreateAgentDto = {
        name: 'Valid Agent',
        prompt: 'You are a valid agent',
        description: 'A valid agent description',
        options: { temperature: 0.7, maxTokens: 1000 },
        toolkits: [
          { toolkitId: 'toolkit-1', settings: { key: 'value' } }
        ],
        knowledgeBases: ['kb-1']
      };

      agentService.createAgent.mockResolvedValue({ ...mockAgent, ...validDto });

      const result = await controller.create(mockUser as any, validDto);

      expect(agentService.createAgent).toHaveBeenCalledWith('user-1', 'org-1', validDto);
      expect(result).toBeDefined();
    });

    it('should accept valid UpdateAgentDto', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const validDto: UpdateAgentDto = {
        name: 'Updated Agent',
        description: 'Updated description',
        prompt: 'Updated prompt',
        options: { temperature: 0.8 },
        toolkits: [
          { toolkitId: 'new-toolkit', settings: {} }
        ],
        knowledgeBases: ['new-kb']
      };

      agentService.updateAgent.mockResolvedValue({ ...mockAgent, ...validDto });

      const result = await controller.update(mockUser as any, 'agent-1', validDto);

      expect(agentService.updateAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', validDto);
      expect(result).toBeDefined();
    });

    it('should accept valid ChatWithAgentDto', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const validDto: ChatWithAgentDto = {
        message: 'Hello, how are you?',
        context: {
          sessionId: 'session-123',
          userId: 'user-456',
          customData: { key: 'value' }
        }
      };

      agentService.chatWithAgent.mockResolvedValue({
        ...mockChatResponse,
        userMessage: validDto.message,
        context: validDto.context
      });

      const result = await controller.chat(mockUser as any, 'agent-1', validDto);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('user-1', 'org-1', 'agent-1', validDto);
      expect(result.data.userMessage).toEqual(validDto.message);
      expect(result.data.context).toEqual(validDto.context);
    });
  });
});