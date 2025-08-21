import {  Module } from '@nestjs/common';

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { LlamaIndexModule } from '../llamaindex/llamaindex.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ToolsModule } from '../tool/tools.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
@Module({
  imports: [PrismaModule, LlamaIndexModule, ToolsModule, KnowledgeBaseModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
