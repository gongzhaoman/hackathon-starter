import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { TaskExecutionStatus } from '@prisma/client';

describe('ScheduledTaskService', () => {
  let service: ScheduledTaskService;
  let prismaService: jest.Mocked<PrismaService>;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let conversationService: jest.Mocked<ConversationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledTaskService,
        {
          provide: PrismaService,
          useValue: {
            scheduledTask: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            taskExecution: {
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
            deleteCronJob: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            createConversation: jest.fn(),
            addMessage: jest.fn(),
            processMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduledTaskService>(ScheduledTaskService);
    prismaService = module.get(PrismaService);
    schedulerRegistry = module.get(SchedulerRegistry);
    conversationService = module.get(ConversationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    it('should create a scheduled task', async () => {
      const taskData = {
        name: 'Test Task',
        agentId: 'agent-123',
        triggerPrompt: 'Test prompt',
        cronExpression: '0 0 9 * * *',
      };

      const mockTask = {
        id: 'task-123',
        ...taskData,
        timezone: 'Asia/Shanghai',
        enabled: true,
        nextRun: new Date(),
        agent: { id: 'agent-123', name: 'Test Agent' },
      };

      (prismaService.scheduledTask.create as jest.Mock).mockResolvedValue(mockTask as any);

      const result = await service.createTask(taskData);

      expect(prismaService.scheduledTask.create).toHaveBeenCalledWith({
        data: {
          ...taskData,
          timezone: 'Asia/Shanghai',
          enabled: true,
          nextRun: expect.any(Date),
        },
        include: { agent: true },
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw error for invalid cron expression', async () => {
      const taskData = {
        name: 'Test Task',
        agentId: 'agent-123',
        triggerPrompt: 'Test prompt',
        cronExpression: 'invalid-cron',
      };

      await expect(service.createTask(taskData)).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('getTasksByAgent', () => {
    it('should return tasks for an agent', async () => {
      const agentId = 'agent-123';
      const mockTasks = [
        {
          id: 'task-1',
          name: 'Task 1',
          agentId,
          executions: [],
        },
      ];

      (prismaService.scheduledTask.findMany as jest.Mock).mockResolvedValue(mockTasks as any);

      const result = await service.getTasksByAgent(agentId);

      expect(prismaService.scheduledTask.findMany).toHaveBeenCalledWith({
        where: { agentId },
        include: {
          executions: {
            orderBy: { startTime: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTasks);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        enabled: true,
      };

      (prismaService.scheduledTask.findUnique as jest.Mock).mockResolvedValue(mockTask as any);
      (prismaService.scheduledTask.delete as jest.Mock).mockResolvedValue(mockTask as any);

      await service.deleteTask(taskId);

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(taskId);
      expect(prismaService.scheduledTask.delete).toHaveBeenCalledWith({ where: { id: taskId } });
    });

    it('should throw error if task not found', async () => {
      const taskId = 'non-existent';

      (prismaService.scheduledTask.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteTask(taskId)).rejects.toThrow('Task not found');
    });
  });
});