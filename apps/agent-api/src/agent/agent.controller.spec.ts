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
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
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
      const mockAgents = [mockAgent];
      agentService.findAll.mockResolvedValue(mockAgents);

      const result = await controller.findAll({});

      expect(agentService.findAll).toHaveBeenCalled();
      expect(result.data).toEqual(mockAgents);
    });

    it('should return empty array when no agents exist', async () => {
      agentService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({});

      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single agent', async () => {
      agentService.findOne.mockResolvedValue(mockAgent);

      const result = await controller.findOne('agent-1');

      expect(agentService.findOne).toHaveBeenCalledWith('agent-1');
      expect(result.data).toEqual(mockAgent);
    });

    it('should throw NotFoundException when agent not found', async () => {
      agentService.findOne.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(
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
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.create.mockResolvedValue(createdAgent);

      const result = await controller.create(createAgentDto);

      expect(agentService.create).toHaveBeenCalledWith(createAgentDto);
      expect(result.data).toEqual(createdAgent);
    });

    it('should create agent with toolkits', async () => {
      const createAgentDtoWithToolkits: CreateAgentDto = {
        ...createAgentDto,
        toolkits: [
          { toolkitId: 'toolkit-1', settings: { key: 'value' } }
        ]
      };
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.create.mockResolvedValue(createdAgent);

      const result = await controller.create(createAgentDtoWithToolkits);

      expect(agentService.create).toHaveBeenCalledWith(createAgentDtoWithToolkits);
      expect(result.data).toEqual(createdAgent);
    });

    it('should create agent with knowledge bases', async () => {
      const createAgentDtoWithKB: CreateAgentDto = {
        ...createAgentDto,
        knowledgeBases: ['kb-1', 'kb-2']
      };
      const createdAgent = { ...mockAgent, ...createAgentDto };
      agentService.create.mockResolvedValue(createdAgent);

      const result = await controller.create(createAgentDtoWithKB);

      expect(agentService.create).toHaveBeenCalledWith(createAgentDtoWithKB);
      expect(result.data).toEqual(createdAgent);
    });
  });

  describe('update', () => {
    const updateAgentDto: UpdateAgentDto = {
      name: 'Updated Agent',
      description: 'Updated Description',
    };

    it('should update an agent', async () => {
      const updatedAgent = { ...mockAgent, ...updateAgentDto };
      agentService.update.mockResolvedValue(updatedAgent);

      const result = await controller.update('agent-1', updateAgentDto);

      expect(agentService.update).toHaveBeenCalledWith('agent-1', updateAgentDto);
      expect(result.data).toEqual(updatedAgent);
    });

    it('should update agent with new toolkits', async () => {
      const updateAgentDtoWithToolkits: UpdateAgentDto = {
        ...updateAgentDto,
        toolkits: [
          { toolkitId: 'new-toolkit', settings: {} }
        ]
      };
      const updatedAgent = { ...mockAgent, ...updateAgentDto };
      agentService.update.mockResolvedValue(updatedAgent);

      const result = await controller.update('agent-1', updateAgentDtoWithToolkits);

      expect(agentService.update).toHaveBeenCalledWith('agent-1', updateAgentDtoWithToolkits);
      expect(result.data).toEqual(updatedAgent);
    });

    it('should throw NotFoundException when agent not found', async () => {
      agentService.update.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.update('non-existent', updateAgentDto)).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete an agent', async () => {
      const deletedAgent = { ...mockAgent, deleted: true };
      agentService.remove.mockResolvedValue(deletedAgent);

      const result = await controller.remove('agent-1');

      expect(agentService.remove).toHaveBeenCalledWith('agent-1');
      expect(result.result.resourceId).toEqual("agent-1");
    });

    it('should throw NotFoundException when agent not found', async () => {
      agentService.remove.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.remove('non-existent')).rejects.toThrow(
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
      agentService.chatWithAgent.mockResolvedValue(mockChatResponse);

      const result = await controller.chat('agent-1', chatDto);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('agent-1', chatDto);
      expect(result.data).toEqual(mockChatResponse);
    });

    it('should chat with agent without context', async () => {
      const chatDtoWithoutContext: ChatWithAgentDto = {
        message: 'Hello, agent!',
      };
      const responseWithoutContext = {
        ...mockChatResponse,
        context: {}
      };

      agentService.chatWithAgent.mockResolvedValue(responseWithoutContext);

      const result = await controller.chat('agent-1', chatDtoWithoutContext);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('agent-1', chatDtoWithoutContext);
      expect(result.data).toEqual(responseWithoutContext);
    });

    it('should throw NotFoundException when agent not found', async () => {
      agentService.chatWithAgent.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.chat('non-existent', chatDto)).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('getAgentToolkits', () => {
    it('should return agent toolkits', async () => {
      agentService.getAgentToolkits.mockResolvedValue(mockAgentToolkits);

      const result = await controller.getAgentToolkits('agent-1');

      expect(agentService.getAgentToolkits).toHaveBeenCalledWith('agent-1');
      expect(result.data).toEqual(mockAgentToolkits);
    });

    it('should return empty array when agent has no toolkits', async () => {
      agentService.getAgentToolkits.mockResolvedValue([]);

      const result = await controller.getAgentToolkits('agent-1');

      expect(result.data).toEqual([]);
    });

    it('should throw NotFoundException when agent not found', async () => {
      agentService.getAgentToolkits.mockRejectedValue(
        new NotFoundException('Agent with ID non-existent not found')
      );

      await expect(controller.getAgentToolkits('non-existent')).rejects.toThrow(
        new NotFoundException('Agent with ID non-existent not found')
      );
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      const errorMessage = 'Database connection failed';
      agentService.findAll.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({})).rejects.toThrow(errorMessage);
    });

    it('should handle validation errors from service', async () => {
      const createAgentDto: CreateAgentDto = {
        name: '',
        prompt: 'Invalid agent',
      };

      agentService.create.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create(createAgentDto)).rejects.toThrow('Validation failed');
    });
  });

  describe('input validation', () => {
    it('should accept valid CreateAgentDto', async () => {
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

      agentService.create.mockResolvedValue({ ...mockAgent, ...validDto });

      const result = await controller.create(validDto);

      expect(agentService.create).toHaveBeenCalledWith(validDto);
      expect(result).toBeDefined();
    });

    it('should accept valid UpdateAgentDto', async () => {
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

      agentService.update.mockResolvedValue({ ...mockAgent, ...validDto });

      const result = await controller.update('agent-1', validDto);

      expect(agentService.update).toHaveBeenCalledWith('agent-1', validDto);
      expect(result).toBeDefined();
    });

    it('should accept valid ChatWithAgentDto', async () => {
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

      const result = await controller.chat('agent-1', validDto);

      expect(agentService.chatWithAgent).toHaveBeenCalledWith('agent-1', validDto);
      expect(result.data.userMessage).toEqual(validDto.message);
      expect(result.data.context).toEqual(validDto.context);
    });
  });
});