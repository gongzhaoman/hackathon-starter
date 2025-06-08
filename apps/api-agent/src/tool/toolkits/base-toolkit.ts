import { LlamaindexService } from 'src/llamaindex/llamaindex.service';
import { Settings } from '../interface/settings';
import { Toolkit, ToolsType } from '../interface/toolkit';
import { TOOLKIT_ID_KEY } from '../toolkits.decorator';

export abstract class BaseToolkit implements Toolkit {
  abstract name: string;
  abstract description: string;
  abstract settings: Settings;
  abstract tools: ToolsType[];
  abstract validateSettings(): void;

  protected llamaindexService = new LlamaindexService()
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor() {
    // 立即开始初始化，但不阻塞构造函数
    this.initPromise = this.safeInitTools();
  }

  // 子类可以重写这个方法来进行异步初始化
  protected async initTools(): Promise<void> {
    // 默认什么都不做，子类可以重写
  }

  private async safeInitTools(): Promise<void> {
    try {
      await this.initTools();
      this.isInitialized = true;
    } catch (error) {
      console.error(`Failed to initialize tools for ${this.constructor.name}:`, error);
      throw error;
    }
  }

  applySettings(settings: Settings): void {
    const { agentId, ...otherSettings } = settings;
    this.settings.agentId = agentId;
    for (const key in otherSettings) {
      if (Object.prototype.hasOwnProperty.call(otherSettings, key)) {
        if (key in this.settings) {
          this.settings[key] = otherSettings[key];
        } else {
          throw new Error(`Invalid setting: ${key}`);
        }
      }
    }
    this.validateSettings();
  }

  async getTools(): Promise<ToolsType[]> {
    // 确保初始化完成
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
    return this.tools;
  }

  get id(): string {
    return Reflect.getMetadata(TOOLKIT_ID_KEY, this.constructor);
  }
}
