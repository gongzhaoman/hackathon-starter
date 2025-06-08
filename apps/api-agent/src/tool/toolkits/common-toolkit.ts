import { Logger } from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { LlamaindexService } from '../../llamaindex/llamaindex.service';

import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { ToolsType } from '../interface/toolkit';

dayjs.extend(utc);
dayjs.extend(timezone);

@toolkitId('common-toolkit-01')
export class CommonToolkit extends BaseToolkit {
  name = 'Common Tools';
  description = 'Basic utility tools for common operations';
  settings = {};

  tools: ToolsType[] = [];
  private readonly logger = new Logger(CommonToolkit.name);

  constructor() {
    super(); // BaseToolkit会自动处理异步初始化
  }

  validateSettings(): void {
    // No settings to validate
  }

  protected async initTools(): Promise<void> {
    const llamaindexModules = await this.llamaindexService.getLlamaindexModules()
    const FunctionTool = llamaindexModules.FunctionTool
    this.tools = [
      FunctionTool.from(this.getCurrentTime.bind(this), {
        name: 'getCurrentTime',
        description: 'Get the current time in a specific timezone. ',
        parameters: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description:
                'IANA timezone identifier, e.g., "Asia/Shanghai", "UTC". Optional, defaults to Asia/Shanghai if not provided.',
            },
          },
          required: [],
        },
      }),
    ];
  }

  async getCurrentTime(params: { timezone?: string }): Promise<string> {
    const { timezone = 'Asia/Shanghai' } = params;

    try {
      return dayjs().tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
      return `Failed to get current time: ${(error as Error).message}`;
    }
  }
}
