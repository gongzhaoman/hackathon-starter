import type { OpenAI } from '@llamaindex/openai';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { ToolsType } from '../tool/interface/toolkit';

const httpAgent = process.env.http_proxy
  ? new HttpsProxyAgent(process.env.http_proxy)
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let llamaindexModules: any = null;

@Injectable()
export class LlamaindexService implements OnModuleInit {
  private readonly logger = new Logger(LlamaindexService.name);

  constructor() {}

  async getLlamaindexModules() {
    if (!llamaindexModules) {
      const [openaiModule, llamaindexCore, workflowModule] = await Promise.all([
        import('@llamaindex/openai'),
        import('llamaindex'),
        import('@llamaindex/workflow')
      ]);

      llamaindexModules = {
        openai: openaiModule.openai,
        OpenAIEmbedding: openaiModule.OpenAIEmbedding,
        Settings: llamaindexCore.Settings,
        FunctionTool: llamaindexCore.FunctionTool,
        agent: workflowModule.agent
      };
    }
    return llamaindexModules;
  }

  async onModuleInit() {
    const { openai, OpenAIEmbedding, Settings } = await this.getLlamaindexModules();
    try {
      Settings.llm = openai({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        apiKey: process.env.OPENAI_API_KEY,
        additionalSessionOptions: {
          baseURL: process.env.OPENAI_BASE_URL,
          httpAgent,
        },
      });
      Settings.embedModel = new OpenAIEmbedding({
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      this.logger.log('Default LLM initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize default LLM', error);
    }
  }

  async createAgent(tools: ToolsType[], prompt?: string, llm?: OpenAI) {
    const { agent } = await this.getLlamaindexModules();
    return agent({
      tools,
      systemPrompt: prompt,
      llm: llm,
      verbose: false,
    });
  }
}