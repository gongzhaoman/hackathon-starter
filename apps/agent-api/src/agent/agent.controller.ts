import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './agent.type';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get()
  async findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Post()
  async create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentService.create(createAgentDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    return this.agentService.update(id, updateAgentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }
}
