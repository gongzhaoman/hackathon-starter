import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import { CreateConversationDto, AddMessageDto, ConversationQueryDto } from './conversation.types';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async create(@Body() createDto: CreateConversationDto) {
    const conversation = await this.conversationService.createConversation(createDto);
    return ResponseBuilder.success(conversation, '对话创建成功');
  }

  @Get()
  async findAll(@Query() query: ConversationQueryDto) {
    if (query.agentId) {
      const conversations = await this.conversationService.getConversationsByAgent(query.agentId, query.limit);
      return ResponseBuilder.success(conversations, '查询对话列表成功');
    }
    return ResponseBuilder.success([], '请提供智能体ID');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const conversation = await this.conversationService.getConversation(id);
    return ResponseBuilder.success(conversation, '查询对话成功');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: { title?: string }) {
    const conversation = await this.conversationService.updateConversation(id, updateDto);
    return ResponseBuilder.success(conversation, '对话更新成功');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.conversationService.deleteConversation(id);
    return ResponseBuilder.success(null, '对话删除成功');
  }

  @Post(':id/messages')
  async addMessage(@Param('id') id: string, @Body() messageDto: AddMessageDto) {
    const message = await this.conversationService.addMessage(id, messageDto);
    return ResponseBuilder.success(message, '消息添加成功');
  }

  @Post(':id/process')
  async processMessage(@Param('id') id: string, @Body() body: { message: string }) {
    const result = await this.conversationService.processMessage(id, body.message);
    return ResponseBuilder.success(result, '消息处理成功');
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string, @Query('limit') limit?: number) {
    const messages = await this.conversationService.getMessageHistory(id, limit);
    return ResponseBuilder.success(messages, '查询消息历史成功');
  }
}