import { Test, TestingModule } from '@nestjs/testing';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator';
import type { DataResponse } from '../common/types/api-response.types';

describe('ConversationController', () => {
  let controller: ConversationController;
  let conversationService: jest.Mocked<ConversationService>;

  const mockUser: CurrentUserData = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'test-org-id',
    organizationRole: 'member',
  };

  const mockConversation = {
    id: 'conversation-1',
    agentId: 'agent-1',
    title: 'Test Conversation',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    messages: [],
  };

  const mockMessage = {
    id: 'message-1',
    conversationId: 'conversation-1',
    role: 'USER',
    content: 'Test message',
    metadata: {},
    createdAt: new Date('2023-01-01T00:00:00Z'),
  };

  const mockCreateDto = {
    agentId: 'agent-1',
    title: 'New Conversation',
  };

  const mockAddMessageDto = {
    role: 'USER' as const,
    content: 'Hello',
    metadata: {},
  };

  beforeEach(async () => {
    const mockConversationService = {
      createConversation: jest.fn(),
      getConversationsByAgent: jest.fn(),
      getConversation: jest.fn(),
      updateConversation: jest.fn(),
      deleteConversation: jest.fn(),
      addMessage: jest.fn(),
      processMessage: jest.fn(),
      getMessageHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationController],
      providers: [
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConversationController>(ConversationController);
    conversationService = module.get<ConversationService>(
      ConversationService,
    ) as jest.Mocked<ConversationService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a conversation', async () => {
      conversationService.createConversation.mockResolvedValue(mockConversation as any);

      const result = await controller.create(mockUser, mockCreateDto as any);

      expect(conversationService.createConversation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        mockCreateDto,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockConversation);
      expect((result as DataResponse<any>).message).toBe('对话创建成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Creation failed');
      conversationService.createConversation.mockRejectedValue(error);

      await expect(controller.create(mockUser, mockCreateDto as any)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return conversations for given agentId', async () => {
      const mockConversations = [mockConversation];
      conversationService.getConversationsByAgent.mockResolvedValue(mockConversations as any);

      const result = await controller.findAll(mockUser, { agentId: 'agent-1' });

      expect(conversationService.getConversationsByAgent).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'agent-1',
        undefined,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockConversations);
      expect((result as DataResponse<any>).message).toBe('查询对话列表成功');
    });

    it('should return conversations with limit', async () => {
      const mockConversations = [mockConversation];
      conversationService.getConversationsByAgent.mockResolvedValue(mockConversations as any);

      const result = await controller.findAll(mockUser, { agentId: 'agent-1', limit: 5 });

      expect(conversationService.getConversationsByAgent).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'agent-1',
        5,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockConversations);
    });

    it('should return message when no agentId provided', async () => {
      const result = await controller.findAll(mockUser, {});

      expect(conversationService.getConversationsByAgent).not.toHaveBeenCalled();
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual([]);
      expect((result as DataResponse<any>).message).toBe('请提供智能体ID');
    });
  });

  describe('findOne', () => {
    it('should return a conversation', async () => {
      conversationService.getConversation.mockResolvedValue(mockConversation as any);

      const result = await controller.findOne(mockUser, 'conversation-1');

      expect(conversationService.getConversation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockConversation);
      expect((result as DataResponse<any>).message).toBe('查询对话成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Conversation not found');
      conversationService.getConversation.mockRejectedValue(error);

      await expect(controller.findOne(mockUser, 'conversation-1')).rejects.toThrow(
        'Conversation not found',
      );
    });
  });

  describe('update', () => {
    it('should update a conversation', async () => {
      const updatedConversation = { ...mockConversation, title: 'Updated Title' };
      conversationService.updateConversation.mockResolvedValue(updatedConversation as any);

      const result = await controller.update(mockUser, 'conversation-1', { title: 'Updated Title' });

      expect(conversationService.updateConversation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
        { title: 'Updated Title' },
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(updatedConversation);
      expect((result as DataResponse<any>).message).toBe('对话更新成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Update failed');
      conversationService.updateConversation.mockRejectedValue(error);

      await expect(
        controller.update(mockUser, 'conversation-1', { title: 'Updated Title' }),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should delete a conversation', async () => {
      conversationService.deleteConversation.mockResolvedValue(undefined);

      const result = await controller.remove(mockUser, 'conversation-1');

      expect(conversationService.deleteConversation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toBeNull();
      expect((result as DataResponse<any>).message).toBe('对话删除成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Delete failed');
      conversationService.deleteConversation.mockRejectedValue(error);

      await expect(controller.remove(mockUser, 'conversation-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('addMessage', () => {
    it('should add a message to conversation', async () => {
      conversationService.addMessage.mockResolvedValue(mockMessage as any);

      const result = await controller.addMessage(mockUser, 'conversation-1', mockAddMessageDto);

      expect(conversationService.addMessage).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
        mockAddMessageDto,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockMessage);
      expect((result as DataResponse<any>).message).toBe('消息添加成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Add message failed');
      conversationService.addMessage.mockRejectedValue(error);

      await expect(
        controller.addMessage(mockUser, 'conversation-1', mockAddMessageDto),
      ).rejects.toThrow('Add message failed');
    });
  });

  describe('processMessage', () => {
    it('should process a message', async () => {
      const mockProcessResult = {
        conversationId: 'conversation-1',
        message: mockMessage,
        response: 'AI Response',
      };
      conversationService.processMessage.mockResolvedValue(mockProcessResult as any);

      const result = await controller.processMessage(mockUser, 'conversation-1', {
        message: 'Hello',
      });

      expect(conversationService.processMessage).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
        'Hello',
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockProcessResult);
      expect((result as DataResponse<any>).message).toBe('消息处理成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Process message failed');
      conversationService.processMessage.mockRejectedValue(error);

      await expect(
        controller.processMessage(mockUser, 'conversation-1', { message: 'Hello' }),
      ).rejects.toThrow('Process message failed');
    });
  });

  describe('getMessages', () => {
    it('should return message history without limit', async () => {
      const mockMessages = [mockMessage];
      conversationService.getMessageHistory.mockResolvedValue(mockMessages as any);

      const result = await controller.getMessages(mockUser, 'conversation-1');

      expect(conversationService.getMessageHistory).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
        undefined,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockMessages);
      expect((result as DataResponse<any>).message).toBe('查询消息历史成功');
    });

    it('should return message history with limit', async () => {
      const mockMessages = [mockMessage];
      conversationService.getMessageHistory.mockResolvedValue(mockMessages as any);

      const result = await controller.getMessages(mockUser, 'conversation-1', 10);

      expect(conversationService.getMessageHistory).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'conversation-1',
        10,
      );
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockMessages);
    });

    it('should handle service errors', async () => {
      const error = new Error('Get messages failed');
      conversationService.getMessageHistory.mockRejectedValue(error);

      await expect(controller.getMessages(mockUser, 'conversation-1')).rejects.toThrow(
        'Get messages failed',
      );
    });
  });
});