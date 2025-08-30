import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledTaskController } from './scheduled-task.controller';
import { ScheduledTaskService } from './scheduled-task.service';
import { ResponseBuilder } from '../common/utils/response-builder.utils';
import type { DataResponse } from '../common/types/api-response.types';

describe('ScheduledTaskController', () => {
  let controller: ScheduledTaskController;
  let scheduledTaskService: jest.Mocked<ScheduledTaskService>;

  const mockTask = {
    id: 'task-1',
    name: 'Test Task',
    description: 'Test Description',
    agentId: 'agent-1',
    triggerPrompt: 'Test prompt',
    cronExpression: '0 9 * * *',
    timezone: 'Asia/Shanghai',
    enabled: true,
    nextRun: new Date('2023-01-01T09:00:00Z'),
    lastRun: null,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  };

  const mockExecution = {
    id: 'execution-1',
    taskId: 'task-1',
    status: 'COMPLETED',
    startTime: new Date('2023-01-01T09:00:00Z'),
    endTime: new Date('2023-01-01T09:01:00Z'),
    conversationId: 'conversation-1',
    error: null,
  };

  const mockCreateDto = {
    name: 'Test Task',
    description: 'Test Description',
    agentId: 'agent-1',
    triggerPrompt: 'Test prompt',
    cronExpression: '0 9 * * *',
    timezone: 'Asia/Shanghai',
    enabled: true,
  };

  const mockUpdateDto = {
    name: 'Updated Task',
    enabled: false,
  };

  beforeEach(async () => {
    const mockScheduledTaskService = {
      createTask: jest.fn(),
      getTasksByAgent: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getTaskExecutions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledTaskController],
      providers: [
        {
          provide: ScheduledTaskService,
          useValue: mockScheduledTaskService,
        },
      ],
    }).compile();

    controller = module.get<ScheduledTaskController>(ScheduledTaskController);
    scheduledTaskService = module.get<ScheduledTaskService>(
      ScheduledTaskService,
    ) as jest.Mocked<ScheduledTaskService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a scheduled task', async () => {
      scheduledTaskService.createTask.mockResolvedValue(mockTask as any);

      const result = await controller.create(mockCreateDto as any);

      expect(scheduledTaskService.createTask).toHaveBeenCalledWith(mockCreateDto);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockTask);
      expect((result as DataResponse<any>).message).toBe('定时任务创建成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Creation failed');
      scheduledTaskService.createTask.mockRejectedValue(error);

      await expect(controller.create(mockCreateDto as any)).rejects.toThrow('Creation failed');
      expect(scheduledTaskService.createTask).toHaveBeenCalledWith(mockCreateDto);
    });
  });

  describe('findAll', () => {
    it('should return tasks for given agentId', async () => {
      const mockTasks = [mockTask];
      scheduledTaskService.getTasksByAgent.mockResolvedValue(mockTasks as any);

      const result = await controller.findAll({ agentId: 'agent-1' });

      expect(scheduledTaskService.getTasksByAgent).toHaveBeenCalledWith('agent-1');
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockTasks);
      expect((result as DataResponse<any>).message).toBe('查询定时任务列表成功');
    });

    it('should return empty array message when no agentId provided', async () => {
      const result = await controller.findAll({});

      expect(scheduledTaskService.getTasksByAgent).not.toHaveBeenCalled();
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual([]);
      expect((result as DataResponse<any>).message).toBe('请提供智能体ID');
    });
  });

  describe('findOne', () => {
    it('should return first task for given id', async () => {
      const mockTasks = [mockTask];
      scheduledTaskService.getTasksByAgent.mockResolvedValue(mockTasks as any);

      const result = await controller.findOne('task-1');

      expect(scheduledTaskService.getTasksByAgent).toHaveBeenCalledWith('task-1');
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockTask);
      expect((result as DataResponse<any>).message).toBe('查询定时任务成功');
    });

    it('should handle when no tasks found', async () => {
      scheduledTaskService.getTasksByAgent.mockResolvedValue([] as any);

      const result = await controller.findOne('task-1');

      expect(scheduledTaskService.getTasksByAgent).toHaveBeenCalledWith('task-1');
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update a scheduled task', async () => {
      const updatedTask = { ...mockTask, ...mockUpdateDto };
      scheduledTaskService.updateTask.mockResolvedValue(updatedTask as any);

      const result = await controller.update('task-1', mockUpdateDto as any);

      expect(scheduledTaskService.updateTask).toHaveBeenCalledWith('task-1', mockUpdateDto);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(updatedTask);
      expect((result as DataResponse<any>).message).toBe('定时任务更新成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Update failed');
      scheduledTaskService.updateTask.mockRejectedValue(error);

      await expect(controller.update('task-1', mockUpdateDto as any)).rejects.toThrow('Update failed');
      expect(scheduledTaskService.updateTask).toHaveBeenCalledWith('task-1', mockUpdateDto);
    });
  });

  describe('remove', () => {
    it('should delete a scheduled task', async () => {
      scheduledTaskService.deleteTask.mockResolvedValue(undefined);

      const result = await controller.remove('task-1');

      expect(scheduledTaskService.deleteTask).toHaveBeenCalledWith('task-1');
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toBeNull();
      expect((result as DataResponse<any>).message).toBe('定时任务删除成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Delete failed');
      scheduledTaskService.deleteTask.mockRejectedValue(error);

      await expect(controller.remove('task-1')).rejects.toThrow('Delete failed');
      expect(scheduledTaskService.deleteTask).toHaveBeenCalledWith('task-1');
    });
  });

  describe('getExecutions', () => {
    it('should return task executions without limit', async () => {
      const mockExecutions = [mockExecution];
      scheduledTaskService.getTaskExecutions.mockResolvedValue(mockExecutions as any);

      const result = await controller.getExecutions('task-1');

      expect(scheduledTaskService.getTaskExecutions).toHaveBeenCalledWith('task-1', undefined);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockExecutions);
      expect((result as DataResponse<any>).message).toBe('查询执行历史成功');
    });

    it('should return task executions with limit', async () => {
      const mockExecutions = [mockExecution];
      scheduledTaskService.getTaskExecutions.mockResolvedValue(mockExecutions as any);

      const result = await controller.getExecutions('task-1', 10);

      expect(scheduledTaskService.getTaskExecutions).toHaveBeenCalledWith('task-1', 10);
      expect((result as DataResponse<any>).success).toBe(true);
      expect((result as DataResponse<any>).data).toEqual(mockExecutions);
      expect((result as DataResponse<any>).message).toBe('查询执行历史成功');
    });

    it('should handle service errors', async () => {
      const error = new Error('Get executions failed');
      scheduledTaskService.getTaskExecutions.mockRejectedValue(error);

      await expect(controller.getExecutions('task-1')).rejects.toThrow('Get executions failed');
      expect(scheduledTaskService.getTaskExecutions).toHaveBeenCalledWith('task-1', undefined);
    });
  });
});