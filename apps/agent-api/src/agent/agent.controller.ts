import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  HttpStatus,
  HttpCode,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';

import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';
import type { PaginationQuery } from '../common/types/api-response.types';
import { ResponseBuilder, validatePagination } from '../common/utils/response-builder.utils';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator';

@Controller('agents')
@UseGuards(AuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query() query: PaginationQuery
  ) {
    // 如果有分页参数，返回分页结果
    if (query.page || query.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.agentService.findAllPaginated(
        user.id,
        user.organizationId,
        {
          page,
          pageSize,
          skip,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          search: query.search
        }
      );

      return ResponseBuilder.paginated(
        result.data,
        {
          page,
          pageSize,
          total: result.total
        },
        `获取到 ${result.data.length} 个智能体`
      );
    }

    // 否则返回所有数据
    const agents = await this.agentService.findAll(user.id, user.organizationId);
    return ResponseBuilder.success(agents, `获取到 ${agents.length} 个智能体`);
  }

  @Get(':agentId')
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('agentId') agentId: string
  ) {
    const agent = await this.agentService.findOneAgent(user.id, user.organizationId, agentId);
    if (!agent) {
      throw new NotFoundException(`智能体 ${agentId} 未找到`);
    }
    return ResponseBuilder.success(agent, '获取智能体详情成功');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createAgentDto: CreateAgentDto
  ) {
    const agent = await this.agentService.createAgent(user.id, user.organizationId, createAgentDto);
    return ResponseBuilder.created(agent, '智能体创建成功');
  }

  @Put(':agentId')
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('agentId') agentId: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    const agent = await this.agentService.updateAgent(user.id, user.organizationId, agentId, updateAgentDto);
    return ResponseBuilder.updated(agent, '智能体更新成功');
  }

  @Delete(':agentId')
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('agentId') agentId: string
  ) {
    await this.agentService.removeAgent(user.id, user.organizationId, agentId);
    return ResponseBuilder.deleted(agentId);
  }

  @Post(':agentId/chat')
  async chat(
    @CurrentUser() user: CurrentUserData,
    @Param('agentId') agentId: string,
    @Body() chatDto: ChatWithAgentDto,
  ) {
    const result = await this.agentService.chatWithAgent(user.id, user.organizationId, agentId, chatDto);
    return ResponseBuilder.success(result, '对话成功');
  }

  @Get(':agentId/toolkits')
  async getAgentToolkits(
    @CurrentUser() user: CurrentUserData,
    @Param('agentId') agentId: string
  ) {
    const toolkits = await this.agentService.getAgentToolkits(user.id, user.organizationId, agentId);
    return ResponseBuilder.success(toolkits, `获取到 ${toolkits.length} 个工具包`);
  }
}