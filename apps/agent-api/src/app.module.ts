import { Module } from '@nestjs/common';

import { AgentModule } from './agent/agent.module';
import { LlamaIndexModule } from './llamaindex/llamaindex.module';
import { PrismaModule } from './prisma/prisma.module';
import { ToolsModule } from './tool/tools.module';
import { WorkflowModule } from './workflow/workflow.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ToolsModule,
    WorkflowModule,
    AgentModule,
    LlamaIndexModule,
    KnowledgeBaseModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})

export class AppModule {}
