import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageRole } from '@prisma/client';
import { AgentService } from '../agent/agent.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
  ) {}

  async createConversation(userId: string, organizationId: string | undefined, data: {
    agentId: string;
    title?: string;
  }) {
    return this.prisma.conversation.create({
      data: {
        agentId: data.agentId,
        title: data.title || `对话 ${new Date().toLocaleString()}`,
      },
      include: {
        agent: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getConversation(userId: string, organizationId: string | undefined, conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
        agent: {
          createdById: userId,
          ...(organizationId && { organizationId }),
        },
      },
      include: {
        agent: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getConversationsByAgent(userId: string, organizationId: string | undefined, agentId: string, limit = 20) {
    return this.prisma.conversation.findMany({
      where: {
        agentId,
        agent: {
          createdById: userId,
          ...(organizationId && { organizationId }),
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async addMessage(
    userId: string,
    organizationId: string | undefined,
    conversationId: string,
    data: {
      role: MessageRole;
      content: string;
      metadata?: any;
    }
  ) {
    // 验证用户权限
    const conversation = await this.getConversation(userId, organizationId, conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        metadata: data.metadata,
      },
    });

    // 更新对话的更新时间
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async processMessage(userId: string, organizationId: string | undefined, conversationId: string, userMessage: string) {
    const conversation = await this.getConversation(userId, organizationId, conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    try {
      // 构建消息历史
      const messages = conversation.messages.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));

      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: userMessage,
      });

      // 调用智能体服务处理消息
      const response = await this.agentService.processMessage(
        userId,
        organizationId,
        conversation.agentId,
        messages
      );

      // 保存智能体响应
      const assistantMessage = await this.addMessage(userId, organizationId, conversationId, {
        role: MessageRole.ASSISTANT,
        content: response.content,
        metadata: {
          toolCalls: response.toolCalls || [],
          usage: response.usage || {},
        },
      });

      return {
        conversationId,
        message: assistantMessage,
        response: response.content,
      };

    } catch (error: any) {
      this.logger.error(`Failed to process message in conversation ${conversationId}:`, error);

      // 保存错误信息
      await this.addMessage(userId, organizationId, conversationId, {
        role: MessageRole.ASSISTANT,
        content: `处理消息时发生错误: ${error.message || error}`,
        metadata: { error: true },
      });

      throw error;
    }
  }

  async updateConversation(userId: string, organizationId: string | undefined, conversationId: string, data: {
    title?: string;
  }) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data,
    });
  }

  async deleteConversation(
    userId: string,
    organizationId: string | undefined,
    conversationId: string
  ) {
    // 验证用户权限
    await this.getConversation(userId, organizationId, conversationId);

    // 级联删除消息会自动处理
    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  async getMessageHistory(
    userId: string,
    organizationId: string | undefined,
    conversationId: string,
    limit = 50
  ) {
    // 验证用户权限
    await this.getConversation(userId, organizationId, conversationId);

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}