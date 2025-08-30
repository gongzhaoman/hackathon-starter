import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService } from '../agent/agent.service';
import { MessageRole } from '@prisma/client';

describe('ConversationService', () => {
  let service: ConversationService;
  let prismaService: jest.Mocked<PrismaService>;
  let agentService: jest.Mocked<AgentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            message: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AgentService,
          useValue: {
            processMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    prismaService = module.get(PrismaService);
    agentService = module.get(AgentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create a conversation', async () => {
      const conversationData = {
        agentId: 'agent-123',
        title: 'Test Conversation',
      };

      const mockConversation = {
        id: 'conv-123',
        agentId: 'agent-123',
        title: 'Test Conversation',
        agent: { id: 'agent-123', name: 'Test Agent' },
        messages: [],
      };

      (prismaService.conversation.create as jest.Mock).mockResolvedValue(mockConversation as any);

      const result = await service.createConversation('test-user-id', 'test-org-id', conversationData);

      expect(prismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agent-123',
          title: 'Test Conversation',
        },
        include: {
          agent: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result).toEqual(mockConversation);
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      const conversationId = 'conv-123';
      const messageData = {
        role: MessageRole.USER,
        content: 'Hello',
      };

      const mockMessage = {
        id: 'msg-123',
        conversationId,
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date(),
      };

      const mockConversation = {
        id: conversationId,
        agentId: 'agent-123',
        messages: [],
        agent: { id: 'agent-123', name: 'Test Agent' },
      };

      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation as any);
      (prismaService.message.create as jest.Mock).mockResolvedValue(mockMessage as any);
      (prismaService.conversation.update as jest.Mock).mockResolvedValue({} as any);

      const result = await service.addMessage('test-user-id', 'test-org-id', conversationId, messageData);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          conversationId,
          role: MessageRole.USER,
          content: 'Hello',
          metadata: undefined,
        },
      });
      expect(prismaService.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { updatedAt: expect.any(Date) },
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('processMessage', () => {
    it('should process a user message and get agent response', async () => {
      const conversationId = 'conv-123';
      const userMessage = 'Hello, how are you?';

      const mockConversation = {
        id: conversationId,
        agentId: 'agent-123',
        messages: [],
        agent: { id: 'agent-123', name: 'Test Agent' },
      };

      const mockAgentResponse = {
        content: 'I am fine, thank you!',
        toolCalls: [],
        usage: {},
      };

      const mockMessage = {
        id: 'msg-123',
        role: MessageRole.ASSISTANT,
        content: 'I am fine, thank you!',
      };

      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation as any);
      agentService.processMessage.mockResolvedValue(mockAgentResponse);
      (prismaService.message.create as jest.Mock).mockResolvedValue(mockMessage as any);
      (prismaService.conversation.update as jest.Mock).mockResolvedValue({} as any);

      const result = await service.processMessage('test-user-id', 'test-org-id', conversationId, userMessage);

      expect(agentService.processMessage).toHaveBeenCalledWith('test-user-id', 'test-org-id', 'agent-123', [
        { role: 'user', content: userMessage }
      ]);
      expect(result).toEqual({
        conversationId,
        message: mockMessage,
        response: 'I am fine, thank you!',
      });
    });

    it('should throw error if conversation not found', async () => {
      const conversationId = 'non-existent';
      const userMessage = 'Hello';

      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.processMessage('test-user-id', 'test-org-id', conversationId, userMessage))
        .rejects.toThrow('Conversation not found');
    });
  });
});