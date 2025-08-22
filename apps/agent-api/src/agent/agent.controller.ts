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
} from '@nestjs/common';

import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto, ChatWithAgentDto } from './agent.type';
import type { PaginationQuery } from '../common/types/api-response.types';
import { ResponseBuilder, validatePagination } from '../common/utils/response-builder.utils';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async findAll(@Query() query: PaginationQuery) {
    // 如果有分页参数，返回分页结果
    if (query.page || query.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.agentService.findAllPaginated({ 
        page, 
        pageSize, 
        skip,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        search: query.search
      });
      
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
    const agents = await this.agentService.findAll();
    return ResponseBuilder.success(agents, `获取到 ${agents.length} 个智能体`);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const agent = await this.agentService.findOne(id);
    if (!agent) {
      throw new NotFoundException(`智能体 ${id} 未找到`);
    }
    return ResponseBuilder.success(agent, '获取智能体详情成功');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAgentDto: CreateAgentDto) {
    const agent = await this.agentService.create(createAgentDto);
    return ResponseBuilder.created(agent, '智能体创建成功');
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    const agent = await this.agentService.update(id, updateAgentDto);
    return ResponseBuilder.updated(agent, '智能体更新成功');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.agentService.remove(id);
    return ResponseBuilder.deleted(id);
  }

  @Post(':id/chat')
  async chat(
    @Param('id') id: string,
    @Body() chatDto: ChatWithAgentDto,
  ) {
    const result = await this.agentService.chatWithAgent(id, chatDto);
    return ResponseBuilder.success(result, '对话成功');
  }

  @Get(':id/toolkits')
  async getAgentToolkits(@Param('id') id: string) {
    const toolkits = await this.agentService.getAgentToolkits(id);
    return ResponseBuilder.success(toolkits, `获取到 ${toolkits.length} 个工具包`);
  }
}