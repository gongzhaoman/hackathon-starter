import { FunctionTool } from 'llamaindex';

import { Settings } from './settings';
import { Prisma } from '@prisma/client';

export type ToolsType = FunctionTool<any, any>;

export interface Toolkit {
  readonly id: string;
  name: string;
  description: string;
  settings: Settings;
  tools: ToolsType[];
  applySettings(settings: Prisma.JsonValue): void;
  getTools(): Promise<ToolsType[]>;
}
