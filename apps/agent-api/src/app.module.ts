import { Module } from '@nestjs/common';

import { AgentModule } from './agent/agent.module';
import { LlamaIndexModule } from './llamaindex/llamaindex.module';
import { PrismaModule } from './prisma/prisma.module';
import { ToolsModule } from './tool/tools.module';
import { WorkflowModule } from './workflow/workflow.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ScheduledTaskModule } from './scheduled-task/scheduled-task.module';
import { ConversationModule } from './conversation/conversation.module';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    ToolsModule,
    WorkflowModule,
    AgentModule,
    LlamaIndexModule,
    KnowledgeBaseModule,
    ScheduledTaskModule,
    ConversationModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}
