import { Injectable, Logger } from '@nestjs/common';
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

  async createConversation(data: {
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

  async getConversation(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        agent: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getConversationsByAgent(agentId: string, limit = 20) {
    return this.prisma.conversation.findMany({
      where: { agentId },
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

  async addMessage(conversationId: string, data: {
    role: MessageRole;
    content: string;
    metadata?: any;
  }) {
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

  async processMessage(conversationId: string, userMessage: string) {
    const conversation = await this.getConversation(conversationId);
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
        conversation.agentId,
        messages
      );

      // 保存智能体响应
      const assistantMessage = await this.addMessage(conversationId, {
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
      await this.addMessage(conversationId, {
        role: MessageRole.ASSISTANT,
        content: `处理消息时发生错误: ${error.message || error}`,
        metadata: { error: true },
      });

      throw error;
    }
  }

  async updateConversation(id: string, data: {
    title?: string;
  }) {
    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async deleteConversation(id: string) {
    // 级联删除消息会自动处理
    return this.prisma.conversation.delete({
      where: { id },
    });
  }

  async getMessageHistory(conversationId: string, limit = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}