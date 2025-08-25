import { FunctionTool } from 'llamaindex';
import { toolkitId } from '../toolkits.decorator';
import { BaseToolkit } from './base-toolkit';
import { ScheduledTaskService } from '../../scheduled-task/scheduled-task.service';
import { Logger } from '@nestjs/common';

@toolkitId('scheduled-task-toolkit-01')
export class ScheduledTaskToolkit extends BaseToolkit {
  name = 'scheduled task toolkit';
  description = '定时任务工具包，提供定时任务的创建、管理和查询功能';
  tools: FunctionTool<any, any>[] = [];
  settings = { agentId: '' };
  private readonly logger = new Logger(ScheduledTaskToolkit.name);

  constructor(private readonly scheduledTaskService: ScheduledTaskService) {
    super();
  }

  async getTools() {
    if (this.tools.length === 0) {
      // 创建定时任务工具
      const createTaskTool = FunctionTool.from(
        async ({ name, description, triggerPrompt, cronExpression, timezone, enabled }: {
          name: string;
          description?: string;
          triggerPrompt: string;
          cronExpression: string;
          timezone?: string;
          enabled?: boolean;
        }) => {
          try {
            const task = await this.scheduledTaskService.createTask({
              name,
              description,
              agentId: this.settings.agentId as string,
              triggerPrompt,
              cronExpression,
              timezone: timezone || 'Asia/Shanghai',
              enabled: enabled ?? true,
            });
            this.logger.log(`Created scheduled task: ${task.name} (${task.id})`);
            return JSON.stringify({ 
              success: true, 
              task: {
                id: task.id,
                name: task.name,
                description: task.description,
                triggerPrompt: task.triggerPrompt,
                cronExpression: task.cronExpression,
                timezone: task.timezone,
                enabled: task.enabled,
                nextRun: task.nextRun,
              }
            }, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to create scheduled task:', error);
            return JSON.stringify({ success: false, error: error.message }, null, 2);
          }
        },
        {
          name: 'createScheduledTask',
          description: `创建新的定时任务。该任务会在指定时间自动模拟用户向智能体发送消息，触发智能体工作。

🎯 **触发机制**：
- triggerPrompt是用来触发智能体工作的指令性消息
- 智能体接收到触发指令后会调用相应工具、分析问题并生成专业回复
- 这样可以实现定时报告、数据分析、提醒、查询等自动化功能

🕒 **Cron表达式格式**：
- 格式：秒 分 时 日 月 星期
- 例子：
  - "0 0 9 * * *" - 每天上午9点
  - "0 0 9 * * 1-5" - 工作日上午9点
  - "0 30 18 * * *" - 每天下午6点30分
  - "0 0 12 1 * *" - 每月1号中午12点
  - "0 0/30 * * * *" - 每30分钟

⏰ **时区支持**：
- 默认使用 Asia/Shanghai (北京时间)
- 支持其他时区如：UTC, America/New_York 等

💡 **触发指令示例**：
- 天气查询：triggerPrompt = "查询今天的天气情况并给出穿衣建议"
- 数据报告：triggerPrompt = "生成昨日销售数据报告，包含趋势分析"
- 健康提醒：triggerPrompt = "提醒我注意健康，检查今日运动目标完成情况"
- 知识检索：triggerPrompt = "查询知识库中今天的重要会议安排"
- 任务规划：triggerPrompt = "分析我的待办事项，制定今日工作优先级"

📝 **编写技巧**：
- 使用指令性语言，明确告诉智能体要做什么
- 可以指定调用特定工具或查询特定数据源
- 添加具体要求，如"包含趋势分析"、"生成建议"等
- triggerPrompt是触发指令，智能体会据此调用工具并生成专业回复
- 所有对话记录都会被保存，可查看执行历史`,
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '任务名称，用于标识和管理任务'
              },
              description: {
                type: 'string',
                description: '任务描述，可选'
              },
              triggerPrompt: {
                type: 'string',
                description: '触发智能体工作的指令性消息。使用明确的动作词汇，如"查询"、"生成"、"分析"、"提醒"等。例如："查询今日天气并给出建议"、"生成昨日销售报告"'
              },
              cronExpression: {
                type: 'string',
                description: 'Cron表达式，定义任务执行时间。格式：秒 分 时 日 月 星期'
              },
              timezone: {
                type: 'string',
                description: '时区设置，默认为 Asia/Shanghai',
                default: 'Asia/Shanghai'
              },
              enabled: {
                type: 'boolean',
                description: '是否立即启用任务，默认为 true',
                default: true
              },
            },
            required: ['name', 'triggerPrompt', 'cronExpression'],
          },
        } as any,
      );

      // 更新定时任务工具
      const updateTaskTool = FunctionTool.from(
        async ({ taskId, name, description, triggerPrompt, cronExpression, timezone, enabled }: {
          taskId: string;
          name?: string;
          description?: string;
          triggerPrompt?: string;
          cronExpression?: string;
          timezone?: string;
          enabled?: boolean;
        }) => {
          try {
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (triggerPrompt !== undefined) updateData.triggerPrompt = triggerPrompt;
            if (cronExpression !== undefined) updateData.cronExpression = cronExpression;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (enabled !== undefined) updateData.enabled = enabled;

            const task = await this.scheduledTaskService.updateTask(taskId, updateData);
            this.logger.log(`Updated scheduled task: ${task.name} (${task.id})`);
            
            return JSON.stringify({ 
              success: true, 
              task: {
                id: task.id,
                name: task.name,
                description: task.description,
                triggerPrompt: task.triggerPrompt,
                cronExpression: task.cronExpression,
                timezone: task.timezone,
                enabled: task.enabled,
                nextRun: task.nextRun,
              }
            }, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to update scheduled task:', error);
            return JSON.stringify({ success: false, error: error.message }, null, 2);
          }
        },
        {
          name: 'updateScheduledTask',
          description: `更新现有的定时任务。可以修改任务的各项配置。

⚠️ **注意事项**：
- 修改cron表达式会重新计算下次执行时间
- 禁用任务会从调度器中移除，启用会重新注册
- 只需提供要修改的字段，未提供的字段保持原值`,
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: '要更新的任务ID'
              },
              name: {
                type: 'string',
                description: '新的任务名称'
              },
              description: {
                type: 'string',
                description: '新的任务描述'
              },
              triggerPrompt: {
                type: 'string',
                description: '新的触发指令内容。使用明确的动作词汇来指导智能体行为'
              },
              cronExpression: {
                type: 'string',
                description: '新的Cron表达式'
              },
              timezone: {
                type: 'string',
                description: '新的时区设置'
              },
              enabled: {
                type: 'boolean',
                description: '是否启用任务'
              },
            },
            required: ['taskId'],
          },
        } as any,
      );

      // 删除定时任务工具
      const deleteTaskTool = FunctionTool.from(
        async ({ taskId }: { taskId: string }) => {
          try {
            await this.scheduledTaskService.deleteTask(taskId);
            this.logger.log(`Deleted scheduled task: ${taskId}`);
            return JSON.stringify({ success: true, message: '定时任务已删除' }, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to delete scheduled task:', error);
            return JSON.stringify({ success: false, error: error.message }, null, 2);
          }
        },
        {
          name: 'deleteScheduledTask',
          description: '删除指定的定时任务。删除后任务将从调度器中移除，无法恢复。',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: '要删除的任务ID'
              },
            },
            required: ['taskId'],
          },
        } as any,
      );

      // 查询定时任务列表工具
      const listTasksTool = FunctionTool.from(
        async () => {
          try {
            const tasks = await this.scheduledTaskService.getTasksByAgent(this.settings.agentId as string);
            return JSON.stringify({ 
              success: true, 
              tasks: tasks.map(task => ({
                id: task.id,
                name: task.name,
                description: task.description,
                triggerPrompt: task.triggerPrompt,
                cronExpression: task.cronExpression,
                timezone: task.timezone,
                enabled: task.enabled,
                lastRun: task.lastRun,
                nextRun: task.nextRun,
                createdAt: task.createdAt,
                recentExecutions: task.executions.map(exec => ({
                  id: exec.id,
                  status: exec.status,
                  startTime: exec.startTime,
                  endTime: exec.endTime,
                  error: exec.error,
                })),
              }))
            }, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to list scheduled tasks:', error);
            return JSON.stringify({ success: false, error: error.message }, null, 2);
          }
        },
        {
          name: 'listScheduledTasks',
          description: `查询当前智能体的所有定时任务。

📋 **返回信息**：
- 任务基本信息（名称、描述、Cron表达式等）
- 执行状态（最后执行时间、下次执行时间）
- 最近5次执行记录`,
          parameters: {
            type: 'object',
            properties: {},
          },
        } as any,
      );

      // 查询任务执行历史工具
      const getExecutionsTool = FunctionTool.from(
        async ({ taskId, limit }: { taskId: string; limit?: number }) => {
          try {
            const executions = await this.scheduledTaskService.getTaskExecutions(taskId, limit || 20);
            return JSON.stringify({ 
              success: true, 
              executions: executions.map(exec => ({
                id: exec.id,
                status: exec.status,
                startTime: exec.startTime,
                endTime: exec.endTime,
                error: exec.error,
                conversation: exec.conversation ? {
                  id: exec.conversation.id,
                  title: exec.conversation.title,
                  messageCount: exec.conversation.messages.length,
                } : null,
              }))
            }, null, 2);
          } catch (error: any) {
            this.logger.error('Failed to get task executions:', error);
            return JSON.stringify({ success: false, error: error.message }, null, 2);
          }
        },
        {
          name: 'getTaskExecutions',
          description: `查询指定任务的执行历史记录。

📊 **执行记录包含**：
- 执行状态（运行中、已完成、失败）
- 执行时间（开始时间、结束时间）
- 错误信息（如果执行失败）
- 关联的对话信息`,
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: '任务ID'
              },
              limit: {
                type: 'number',
                description: '返回记录数量限制，默认20条',
                default: 20
              },
            },
            required: ['taskId'],
          },
        } as any,
      );

      this.tools = [
        createTaskTool,
        updateTaskTool,
        deleteTaskTool,
        listTasksTool,
        getExecutionsTool,
      ];
    }
    return this.tools;
  }

  validateSettings(): void {
    if (!this.settings.agentId) {
      throw new Error('agentId is required');
    }
  }
}