import { Body, Controller, Post, Get, Param, Delete } from '@nestjs/common';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

import { WorkflowService } from './workflow.service';
import dslSchema from './DSL_schema/dsl_schema_v1.json';

export class CreateWorkflowDslDto {
  @IsString()
  @IsNotEmpty()
  userMessage!: string;
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

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('generate-dsl')
  async generateDsl(@Body() body: CreateWorkflowDslDto) {
    const workflow = await this.workflowService.getCreateDSLWorkflow(
      dslSchema,
      body.userMessage,
    );

    const result = await workflow.execute({
      userMessage: body.userMessage,
    });

    return { dsl: result };
  }

  @Post()
  async createWorkflow(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowService.createWorkflow(createWorkflowDto);
  }

  @Get()
  async getAllWorkflows() {
    return this.workflowService.getAllWorkflows();
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    return this.workflowService.getWorkflow(id);
  }

  @Post(':id/execute')
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeDto: ExecuteWorkflowDto,
  ) {
    return this.workflowService.executeWorkflow(id, executeDto.input, executeDto.context);
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    return this.workflowService.deleteWorkflow(id);
  }
}
