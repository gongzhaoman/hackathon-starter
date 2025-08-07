import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { CommonToolkit } from './toolkits/common-toolkit';
import { ToolExplorerToolkit } from './toolkits/tool-explorer-toolkit';
import { KnowledgeBaseToolkit } from './toolkits/knowledge-base-toolkit';
import { KnowledgeBaseExplorerToolkit } from './toolkits/knowledge-base-explorer-toolkit';
import { ToolkitsController } from './toolkits.controller';
import { ToolkitsService } from './toolkits.service';
import { ToolsService } from './tools.service';
import { LlamaIndexModule } from '../llamaindex/llamaindex.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [DiscoveryModule, LlamaIndexModule, KnowledgeBaseModule, PrismaModule],
  controllers: [ToolkitsController],
  providers: [
    ToolsService,
    ToolkitsService,
    CommonToolkit,
    ToolExplorerToolkit,
    KnowledgeBaseToolkit,
    KnowledgeBaseExplorerToolkit
  ],
  exports: [ToolsService, ToolkitsService],
})
export class ToolsModule {}
