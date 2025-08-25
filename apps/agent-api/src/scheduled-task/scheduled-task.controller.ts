import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ScheduledTaskService } from './scheduled-task.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import { CreateScheduledTaskDto, UpdateScheduledTaskDto, ScheduledTaskQueryDto } from './scheduled-task.types';

@Controller('scheduled-tasks')
export class ScheduledTaskController {
  constructor(private readonly scheduledTaskService: ScheduledTaskService) {}

  @Post()
  async create(@Body() createDto: CreateScheduledTaskDto) {
    const task = await this.scheduledTaskService.createTask(createDto);
    return ResponseBuilder.success(task, '定时任务创建成功');
  }

  @Get()
  async findAll(@Query() query: ScheduledTaskQueryDto) {
    if (query.agentId) {
      const tasks = await this.scheduledTaskService.getTasksByAgent(query.agentId);
      return ResponseBuilder.success(tasks, '查询定时任务列表成功');
    }
    return ResponseBuilder.success([], '请提供智能体ID');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tasks = await this.scheduledTaskService.getTasksByAgent(id);
    const task = tasks[0]; // 这里需要改进，应该直接根据任务ID查询
    return ResponseBuilder.success(task, '查询定时任务成功');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateScheduledTaskDto) {
    const task = await this.scheduledTaskService.updateTask(id, updateDto);
    return ResponseBuilder.success(task, '定时任务更新成功');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.scheduledTaskService.deleteTask(id);
    return ResponseBuilder.success(null, '定时任务删除成功');
  }

  @Get(':id/executions')
  async getExecutions(@Param('id') id: string, @Query('limit') limit?: number) {
    const executions = await this.scheduledTaskService.getTaskExecutions(id, limit);
    return ResponseBuilder.success(executions, '查询执行历史成功');
  }
}