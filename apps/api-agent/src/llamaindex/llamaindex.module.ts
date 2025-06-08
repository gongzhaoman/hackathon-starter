import { Module } from '@nestjs/common';

import { LlamaindexService } from './llamaindex.service';

@Module({
  providers: [LlamaindexService],
  exports: [LlamaindexService],
})
export class LlamaIndexModule {}
