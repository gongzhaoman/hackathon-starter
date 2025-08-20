import { Body, Controller, Post, Get, Param, Delete, Put } from '@nestjs/common';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

import { WorkflowService } from './workflow.service';
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

export class UpdateWorkflowDslDto {
  @IsObject()
  @IsNotEmpty()
  dsl!: any;
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

  @Get(':id/agents')
  async getWorkflowAgents(@Param('id') id: string) {
    return this.workflowService.getWorkflowAgents(id);
  }

  @Put(':id/agents/:agentName')
  async updateWorkflowAgent(
    @Param('id') workflowId: string,
    @Param('agentName') agentName: string,
    @Body() updateDto: UpdateWorkflowAgentDto,
  ) {
    return this.workflowService.updateWorkflowAgent(workflowId, agentName, updateDto);
  }



  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    // 先清理关联的智能体
    await this.workflowService.deleteWorkflowAgents(id);
    // 再删除工作流
    return this.workflowService.deleteWorkflow(id);
  }
}
