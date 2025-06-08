import { Body, Controller, Post } from '@nestjs/common';

import { WorkflowService } from './workflow.service';
import dslSchema from './DSL_schema/dsl_schema_v1.json';

class CreateWorkflowDslDto {
  userMessage!: string;
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
}
