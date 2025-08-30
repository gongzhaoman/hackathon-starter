import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import { CreateConversationDto, AddMessageDto, ConversationQueryDto } from './conversation.types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateConversationDto
  ) {
    const conversation = await this.conversationService.createConversation(user.id, user.organizationId, createDto);
    return ResponseBuilder.success(conversation, '对话创建成功');
  }

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ConversationQueryDto
  ) {
    if (query.agentId) {
      const conversations = await this.conversationService.getConversationsByAgent(user.id, user.organizationId, query.agentId, query.limit);
      return ResponseBuilder.success(conversations, '查询对话列表成功');
    }
    return ResponseBuilder.success([], '请提供智能体ID');
  }

  @Get(':conversationId')
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string
  ) {
    const conversation = await this.conversationService.getConversation(user.id, user.organizationId, conversationId);
    return ResponseBuilder.success(conversation, '查询对话成功');
  }

  @Put(':conversationId')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string, 
    @Body() updateDto: { title?: string }
  ) {
    const conversation = await this.conversationService.updateConversation(user.id, user.organizationId, conversationId, updateDto);
    return ResponseBuilder.success(conversation, '对话更新成功');
  }

  @Delete(':conversationId')
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string
  ) {
    await this.conversationService.deleteConversation(user.id, user.organizationId, conversationId);
    return ResponseBuilder.success(null, '对话删除成功');
  }

  @Post(':conversationId/messages')
  async addMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string, 
    @Body() messageDto: AddMessageDto
  ) {
    const message = await this.conversationService.addMessage(user.id, user.organizationId, conversationId, messageDto);
    return ResponseBuilder.success(message, '消息添加成功');
  }

  @Post(':conversationId/process')
  async processMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string, 
    @Body() body: { message: string }
  ) {
    const result = await this.conversationService.processMessage(user.id, user.organizationId, conversationId, body.message);
    return ResponseBuilder.success(result, '消息处理成功');
  }

  @Get(':conversationId/messages')
  async getMessages(
    @CurrentUser() user: CurrentUserData,
    @Param('conversationId') conversationId: string, 
    @Query('limit') limit?: number
  ) {
    const messages = await this.conversationService.getMessageHistory(user.id, user.organizationId, conversationId, limit);
    return ResponseBuilder.success(messages, '查询消息历史成功');
  }
}