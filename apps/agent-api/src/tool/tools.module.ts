import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { CommonToolkit } from './toolkits/common-toolkit';
import { ToolExplorerToolkit } from './toolkits/tool-explorer-toolkit';
import { ToolkitsService } from './toolkits.service';
import { ToolsService } from './tools.service';
import { LlamaIndexModule } from '../llamaindex/llamaindex.module';

@Module({
  imports: [DiscoveryModule, LlamaIndexModule],
  providers: [ToolsService, ToolkitsService, CommonToolkit, ToolExplorerToolkit],
  exports: [ToolsService, ToolkitsService],
})
export class ToolsModule {}
