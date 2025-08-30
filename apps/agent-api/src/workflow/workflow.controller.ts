import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Put,
  Query,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

import { WorkflowService } from './workflow.service';
import type { PaginationQuery } from '../common/types/api-response.types';
import { ResponseBuilder, validatePagination } from '../common/utils/response-builder.utils';
import dslSchema from './DSL_schema/dsl_schema_v1.json';

export class CreateWorkflowDslDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsObject()
  @IsOptional()
  inputSchema?: Record<string, string>;

  @IsObject()
  @IsOptional()
  outputSchema?: Record<string, string>;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  dsl!: any;
}

export class ExecuteWorkflowDto {
  @IsObject()
  @IsNotEmpty()
  input!: any;

  @IsObject()
  @IsOptional()
  context?: any;
}

export class UpdateWorkflowAgentDto {
  @IsString()
  @IsOptional()
  prompt?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  options?: any;
}

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('generate-dsl')
  async generateDsl(@Body() body: CreateWorkflowDslDto) {
    const workflow = await this.workflowService.createDslGeneratorWorkflow(
      dslSchema,
      body.description,
      body.inputSchema,
      body.outputSchema,
    );

    const result = await workflow.execute({
      description: body.description,
    });

    return ResponseBuilder.success({ dsl: result }, 'DSL生成成功');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
    const workflow = await this.workflowService.createWorkflow(createWorkflowDto);
    return ResponseBuilder.created(workflow, '工作流创建成功');
  }

  @Get()
  async getAllWorkflows(@Query() query?: PaginationQuery) {
    // 如果有分页参数，返回分页结果
    if (query?.page || query?.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.workflowService.getAllWorkflowsPaginated({
        page,
        pageSize,
        skip,
        search: query.search
      });

      return ResponseBuilder.paginated(
        result.data,
        { page, pageSize, total: result.total },
        `获取到 ${result.data.length} 个工作流`
      );
    }

    const workflows = await this.workflowService.getAllWorkflows();
    return ResponseBuilder.success(workflows, `获取到 ${workflows.length} 个工作流`);
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflow(id);
    return ResponseBuilder.success(workflow, '获取工作流详情成功');
  }

  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeDto: ExecuteWorkflowDto,
  ) {
    const result = await this.workflowService.executeWorkflow(
      id,
      executeDto.input,
      executeDto.context
    );
    return ResponseBuilder.success(result, '工作流执行成功');
  }

  @Get(':id/agents')
  async getWorkflowAgents(@Param('id') id: string) {
    const agents = await this.workflowService.getWorkflowAgents(id);
    return ResponseBuilder.success(agents, `获取到 ${agents.length} 个工作流智能体`);
  }

  @Put(':id/agents/:agentName')
  async updateWorkflowAgent(
    @Param('id') workflowId: string,
    @Param('agentName') agentName: string,
    @Body() updateDto: UpdateWorkflowAgentDto,
  ) {
    const result = await this.workflowService.updateWorkflowAgent(
      workflowId,
      agentName,
      updateDto
    );
    return ResponseBuilder.updated(result, '工作流智能体更新成功');
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    // 先清理关联的智能体
    await this.workflowService.deleteWorkflowAgents(id);
    // 再删除工作流
    await this.workflowService.deleteWorkflow(id);
    return ResponseBuilder.deleted(id);
  }
}