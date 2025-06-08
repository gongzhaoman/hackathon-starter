import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module';
import { ToolsModule } from '../tool/tools.module';

import { EventBus } from './event-bus';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
@Module({
  controllers: [WorkflowController],
  imports: [ToolsModule, AgentModule],
  providers: [WorkflowService, EventBus],
  exports: [WorkflowService, EventBus],
})
export class WorkflowModule {}
