import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { TaskExecutionStatus } from '@prisma/client';

@Injectable()
export class ScheduledTaskService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly conversationService: ConversationService,
  ) {}

  async onModuleInit() {
    // 启动时加载所有启用的定时任务
    await this.loadAllActiveTasks();
  }

  private async loadAllActiveTasks() {
    const activeTasks = await this.prisma.scheduledTask.findMany({
      where: { enabled: true },
      include: { agent: true },
    });

    for (const task of activeTasks) {
      await this.registerCronJob(task);
    }

    this.logger.log(`Loaded ${activeTasks.length} active scheduled tasks`);
  }

  async createTask(data: {
    name: string;
    description?: string;
    agentId: string;
    triggerPrompt: string;
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
  }) {
    // 验证cron表达式
    this.validateCronExpression(data.cronExpression);

    const task = await this.prisma.scheduledTask.create({
      data: {
        ...data,
        timezone: data.timezone || 'Asia/Shanghai',
        enabled: data.enabled ?? true,
        nextRun: this.calculateNextRun(data.cronExpression, data.timezone),
      },
      include: { agent: true },
    });

    // 如果任务启用，注册到调度器
    if (task.enabled) {
      await this.registerCronJob(task);
    }

    return task;
  }

  async updateTask(id: string, data: Partial<{
    name: string;
    description: string;
    triggerPrompt: string;
    cronExpression: string;
    timezone: string;
    enabled: boolean;
  }>) {
    const existingTask = await this.prisma.scheduledTask.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    // 如果修改了cron表达式，验证新的表达式
    if (data.cronExpression) {
      this.validateCronExpression(data.cronExpression);
    }

    // 先从调度器中移除旧任务
    if (existingTask.enabled) {
      this.unregisterCronJob(id);
    }

    const updateData: any = { ...data };
    if (data.cronExpression || data.timezone) {
      updateData.nextRun = this.calculateNextRun(
        data.cronExpression || existingTask.cronExpression,
        data.timezone || existingTask.timezone
      );
    }

    const updatedTask = await this.prisma.scheduledTask.update({
      where: { id },
      data: updateData,
      include: { agent: true },
    });

    // 如果任务启用，重新注册到调度器
    if (updatedTask.enabled) {
      await this.registerCronJob(updatedTask);
    }

    return updatedTask;
  }

  async deleteTask(id: string) {
    const task = await this.prisma.scheduledTask.findUnique({ where: { id } });
    if (!task) {
      throw new Error('Task not found');
    }

    // 从调度器中移除
    if (task.enabled) {
      this.unregisterCronJob(id);
    }

    await this.prisma.scheduledTask.delete({ where: { id } });
  }

  async getTasksByAgent(agentId: string) {
    return this.prisma.scheduledTask.findMany({
      where: { agentId },
      include: {
        executions: {
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskExecutions(taskId: string, limit = 20) {
    return this.prisma.taskExecution.findMany({
      where: { taskId },
      include: {
        conversation: {
          include: {
            messages: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });
  }

  private async registerCronJob(task: any) {
    try {
      const job = new CronJob(
        task.cronExpression,
        () => this.executeTask(task.id),
        null,
        false,
        task.timezone || 'Asia/Shanghai'
      );

      this.schedulerRegistry.addCronJob(task.id, job as any);
      job.start();

      this.logger.log(`Registered cron job for task: ${task.name} (${task.id})`);
    } catch (error) {
      this.logger.error(`Failed to register cron job for task ${task.id}:`, error);
    }
  }

  private unregisterCronJob(taskId: string) {
    try {
      this.schedulerRegistry.deleteCronJob(taskId);
      this.logger.log(`Unregistered cron job for task: ${taskId}`);
    } catch (error) {
      this.logger.warn(`Failed to unregister cron job for task ${taskId}:`, error);
    }
  }

  private async executeTask(taskId: string) {
    const task = await this.prisma.scheduledTask.findUnique({
      where: { id: taskId },
      include: { agent: true },
    });

    if (!task || !task.enabled) {
      return;
    }

    const execution = await this.prisma.taskExecution.create({
      data: {
        taskId,
        status: TaskExecutionStatus.RUNNING,
      },
    });

    try {
      this.logger.log(`Executing scheduled task: ${task.name} (${taskId})`);

      // 创建对话并发送消息给智能体
      const conversation = await this.conversationService.createConversation({
        agentId: task.agentId,
        title: `定时任务: ${task.name}`,
      });

      // 发送模拟的用户消息给智能体
      await this.conversationService.addMessage(conversation.id, {
        role: 'USER',
        content: task.triggerPrompt,
      });

      // 智能体处理用户消息并调用工具生成响应
      const response = await this.conversationService.processMessage(conversation.id, task.triggerPrompt);

      // 更新执行记录
      await this.prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: TaskExecutionStatus.COMPLETED,
          endTime: new Date(),
          conversationId: conversation.id,
        },
      });

      // 更新任务的最后执行时间和下次执行时间
      await this.prisma.scheduledTask.update({
        where: { id: taskId },
        data: {
          lastRun: new Date(),
          nextRun: this.calculateNextRun(task.cronExpression, task.timezone),
        },
      });

      this.logger.log(`Successfully executed task: ${task.name} (${taskId})`);

    } catch (error: any) {
      this.logger.error(`Failed to execute task ${taskId}:`, error);

      await this.prisma.taskExecution.update({
        where: { id: execution.id },
        data: {
          status: TaskExecutionStatus.FAILED,
          endTime: new Date(),
          error: error.message || error,
        },
      });
    }
  }

  private validateCronExpression(cronExpression: string) {
    try {
      new CronJob(cronExpression, () => {}, null, false);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
  }

  private calculateNextRun(cronExpression: string, timezone = 'Asia/Shanghai'): Date {
    try {
      const job = new CronJob(cronExpression, () => {}, null, false, timezone);
      return job.nextDate().toJSDate();
    } catch (error) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 默认24小时后
    }
  }
}