import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowController, CreateWorkflowDslDto, CreateWorkflowDto, ExecuteWorkflowDto, UpdateWorkflowAgentDto } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { CurrentUserData } from '../auth/current-user.decorator';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let workflowService: any;
  
  const mockUser: CurrentUserData = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'test-org-id',
  };

  const mockWorkflow = { 
    id: 'workflow-1', 
    name: 'Test Workflow',
    DSL: { id: 'test', name: 'Test', steps: [] }
  };

  const mockWorkflowAgent = { 
    workflowId: 'workflow-1', 
    agentId: 'agent-1',
    agent: { id: 'agent-1', name: 'Test Agent' }
  };

  const mockExecutionResult = { workflowId: 'workflow-1' };

  beforeEach(async () => {
    const mockWorkflowService = {
      createDslGeneratorWorkflow: jest.fn(),
      createWorkflow: jest.fn(),
      getAllWorkflows: jest.fn(),
      findOneWorkflow: jest.fn(),
      executeWorkflow: jest.fn(),
      getWorkflowAgents: jest.fn(),
      updateWorkflowAgent: jest.fn(),
      deleteWorkflowAgents: jest.fn(),
      deleteWorkflow: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: mockWorkflowService,
        },
      ],
    }).compile();

    controller = module.get<WorkflowController>(WorkflowController);
    workflowService = module.get(WorkflowService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateDsl', () => {
    const generateDslDto: CreateWorkflowDslDto = {
      description: 'Create a workflow that processes user data',
      inputSchema: { data: 'string' },
      outputSchema: { result: 'string' }
    };

    it('should generate DSL from user message', async () => {
      const mockDslWorkflow = {
        execute: jest.fn().mockResolvedValue(mockWorkflow.DSL)
      };

      workflowService.createDslGeneratorWorkflow.mockResolvedValue(mockDslWorkflow);

      const result = await controller.generateDsl(generateDslDto);

      expect(workflowService.createDslGeneratorWorkflow).toHaveBeenCalledWith(
        expect.any(Object), // dslSchema
        generateDslDto.description,
        generateDslDto.inputSchema,
        generateDslDto.outputSchema
      );
      expect(mockDslWorkflow.execute).toHaveBeenCalledWith({
        description: generateDslDto.description
      });
      expect(result.data).toEqual({ dsl: mockWorkflow.DSL });
    });

    it('should handle DSL generation errors', async () => {
      workflowService.createDslGeneratorWorkflow.mockRejectedValue(new Error('DSL generation failed'));

      await expect(controller.generateDsl(generateDslDto)).rejects.toThrow('DSL generation failed');
    });
  });

  describe('createWorkflow', () => {
    const createWorkflowDto: CreateWorkflowDto = {
      name: 'New Workflow',
      description: 'New workflow description',
      dsl: mockWorkflow.DSL
    };

    it('should create a new workflow', async () => {
      workflowService.createWorkflow.mockResolvedValue(mockWorkflow);

      const result = await controller.createWorkflow(mockUser, createWorkflowDto);

      expect(workflowService.createWorkflow).toHaveBeenCalledWith(mockUser.id, mockUser.organizationId, createWorkflowDto);
      expect(result.data).toEqual(mockWorkflow);
    });

    it('should handle creation errors', async () => {
      workflowService.createWorkflow.mockRejectedValue(new Error('Invalid DSL'));

      await expect(controller.createWorkflow(mockUser, createWorkflowDto)).rejects.toThrow('Invalid DSL');
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all workflows', async () => {
      const mockWorkflows = [mockWorkflow];
      workflowService.getAllWorkflows.mockResolvedValue(mockWorkflows);

      const result = await controller.getAllWorkflows(mockUser);

      expect(workflowService.getAllWorkflows).toHaveBeenCalledWith(mockUser.id, mockUser.organizationId);
      expect(result.data).toEqual(mockWorkflows);
    });

    it('should return empty array when no workflows exist', async () => {
      workflowService.getAllWorkflows.mockResolvedValue([]);

      const result = await controller.getAllWorkflows(mockUser);

      expect(result.data).toEqual([]);
    });
  });

  describe('getWorkflow', () => {
    it('should return a single workflow', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      workflowService.findOneWorkflow.mockResolvedValue(mockWorkflow);

      const result = await controller.getWorkflow(mockUser as any, 'workflow-1');

      expect(workflowService.findOneWorkflow).toHaveBeenCalledWith('user-1', 'org-1', 'workflow-1');
      expect(result.data).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      workflowService.findOneWorkflow.mockRejectedValue(
        new NotFoundException('Workflow with id non-existent not found')
      );

      await expect(controller.getWorkflow(mockUser as any, 'non-existent')).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );
    });
  });

  describe('executeWorkflow', () => {
    const executeDto: ExecuteWorkflowDto = {
      input: { userMessage: 'Hello' },
      context: { sessionId: 'test-session' }
    };

    it('should execute workflow with input and context', async () => {
      workflowService.executeWorkflow.mockResolvedValue(mockExecutionResult);

      const result = await controller.executeWorkflow(mockUser, 'workflow-1', executeDto);

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.organizationId,
        'workflow-1',
        executeDto.input,
        executeDto.context
      );
      expect(result.data).toEqual(mockExecutionResult);
    });

    it('should execute workflow with only input', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const executeDtoWithoutContext: ExecuteWorkflowDto = {
        input: { userMessage: 'Hello' }
      };

      workflowService.executeWorkflow.mockResolvedValue(mockExecutionResult);

      const result = await controller.executeWorkflow(mockUser as any, 'workflow-1', executeDtoWithoutContext);

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'workflow-1',
        executeDtoWithoutContext.input,
        undefined
      );
      expect(result.data).toEqual(mockExecutionResult);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      workflowService.executeWorkflow.mockRejectedValue(
        new NotFoundException('Workflow with id non-existent not found')
      );

      await expect(controller.executeWorkflow(mockUser as any, 'non-existent', executeDto)).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );
    });

    it('should handle execution errors', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      workflowService.executeWorkflow.mockRejectedValue(new Error('Execution failed'));

      await expect(controller.executeWorkflow(mockUser as any, 'workflow-1', executeDto)).rejects.toThrow('Execution failed');
    });
  });

  describe('getWorkflowAgents', () => {
    it('should return workflow agents', async () => {
      const mockWorkflowAgents = [mockWorkflowAgent];
      workflowService.getWorkflowAgents.mockResolvedValue(mockWorkflowAgents);

      const result = await controller.getWorkflowAgents('workflow-1');

      expect(workflowService.getWorkflowAgents).toHaveBeenCalledWith('workflow-1');
      expect(result.data).toEqual(mockWorkflowAgents);
    });

    it('should return empty array when workflow has no agents', async () => {
      workflowService.getWorkflowAgents.mockResolvedValue([]);

      const result = await controller.getWorkflowAgents('workflow-1');

      expect(result.data).toEqual([]);
    });
  });

  describe('updateWorkflowAgent', () => {
    const updateDto: UpdateWorkflowAgentDto = {
      prompt: 'Updated prompt',
      description: 'Updated description',
      options: { temperature: 0.8 }
    };

    it('should update workflow agent', async () => {
      const updatedAgent = {
        ...mockWorkflowAgent.agent,
        ...updateDto
      };

      workflowService.updateWorkflowAgent.mockResolvedValue(updatedAgent);

      const result = await controller.updateWorkflowAgent('workflow-1', 'agent-1', updateDto);

      expect(workflowService.updateWorkflowAgent).toHaveBeenCalledWith(
        'workflow-1',
        'agent-1',
        updateDto
      );
      expect(result.data).toEqual(updatedAgent);
    });

    it('should handle partial updates', async () => {
      const partialUpdateDto: UpdateWorkflowAgentDto = {
        prompt: 'New prompt only'
      };

      const updatedAgent = {
        ...mockWorkflowAgent.agent,
        prompt: 'New prompt only'
      };

      workflowService.updateWorkflowAgent.mockResolvedValue(updatedAgent);

      const result = await controller.updateWorkflowAgent('workflow-1', 'agent-1', partialUpdateDto);

      expect(workflowService.updateWorkflowAgent).toHaveBeenCalledWith(
        'workflow-1',
        'agent-1',
        partialUpdateDto
      );
      expect(result.data).toEqual(updatedAgent);
    });

    it('should throw error when workflow agent not found', async () => {
      workflowService.updateWorkflowAgent.mockRejectedValue(
        new Error('Workflow agent agent-1 not found in workflow workflow-1')
      );

      await expect(
        controller.updateWorkflowAgent('workflow-1', 'agent-1', updateDto)
      ).rejects.toThrow('Workflow agent agent-1 not found in workflow workflow-1');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow and its agents', async () => {
      const deletedWorkflow = { ...mockWorkflow, deleted: true };
      workflowService.deleteWorkflowAgents.mockResolvedValue(undefined);
      workflowService.deleteWorkflow.mockResolvedValue(deletedWorkflow);

      const result = await controller.deleteWorkflow(mockUser, 'workflow-1');

      expect(workflowService.deleteWorkflowAgents).toHaveBeenCalledWith('workflow-1');
      expect(workflowService.deleteWorkflow).toHaveBeenCalledWith(mockUser.id, mockUser.organizationId, 'workflow-1');
      expect(result.success).toBe(true);
      expect(result.result.operation).toBe('delete');
    });

    it('should throw NotFoundException when workflow not found', async () => {
      workflowService.deleteWorkflowAgents.mockResolvedValue(undefined);
      workflowService.deleteWorkflow.mockRejectedValue(
        new NotFoundException('Workflow with id non-existent not found')
      );

      await expect(controller.deleteWorkflow(mockUser, 'non-existent')).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );

      expect(workflowService.deleteWorkflowAgents).toHaveBeenCalledWith('non-existent');
    });

    it('should handle errors during agent cleanup', async () => {
      workflowService.deleteWorkflowAgents.mockRejectedValue(new Error('Agent cleanup failed'));

      await expect(controller.deleteWorkflow(mockUser, 'workflow-1')).rejects.toThrow('Agent cleanup failed');

      expect(workflowService.deleteWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('should accept valid CreateWorkflowDslDto', async () => {
      const validDto: CreateWorkflowDslDto = {
        description: 'Create a complex data processing workflow'
      };

      const mockDslWorkflow = {
        execute: jest.fn().mockResolvedValue(mockWorkflow.DSL)
      };

      workflowService.createDslGeneratorWorkflow.mockResolvedValue(mockDslWorkflow);

      const result = await controller.generateDsl(validDto);

      expect(workflowService.createDslGeneratorWorkflow).toHaveBeenCalledWith(
        expect.any(Object),
        validDto.description,
        undefined,
        undefined
      );
      expect(result.data).toBeDefined();
    });

    it('should accept valid CreateWorkflowDto', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const validDto: CreateWorkflowDto = {
        name: 'Complex Workflow',
        description: 'A complex multi-step workflow',
        dsl: {
          ...mockWorkflow.DSL,
          agents: [
            {
              name: 'DataProcessor',
              description: 'Processes input data',
              prompt: 'You are a data processing agent',
              output: { result: 'string' },
              tools: ['getCurrentTime']
            }
          ]
        }
      };

      workflowService.createWorkflow.mockResolvedValue({ ...mockWorkflow, ...validDto });

      const result = await controller.createWorkflow(mockUser as any, validDto);

      expect(workflowService.createWorkflow).toHaveBeenCalledWith('user-1', 'org-1', validDto);
      expect(result.data).toBeDefined();
    });

    it('should accept valid ExecuteWorkflowDto', async () => {
      const mockUser = { id: 'user-1', organizationId: 'org-1' };
      const validDto: ExecuteWorkflowDto = {
        input: {
          userMessage: 'Process this data',
          dataType: 'text',
          options: { priority: 'high' }
        },
        context: {
          sessionId: 'session-123',
          userId: 'user-456',
          metadata: { source: 'api' }
        }
      };

      workflowService.executeWorkflow.mockResolvedValue({
        ...mockExecutionResult,
        input: validDto.input,
      });

      const result = await controller.executeWorkflow(mockUser as any, 'workflow-1', validDto);

      expect(workflowService.executeWorkflow).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'workflow-1',
        validDto.input,
        validDto.context
      );
      expect(result.data).toEqual({ ...mockExecutionResult, input: validDto.input });
    });

    it('should accept valid UpdateWorkflowAgentDto', async () => {
      const validDto: UpdateWorkflowAgentDto = {
        prompt: 'You are an enhanced agent with new capabilities',
        description: 'Enhanced agent description',
        options: {
          temperature: 0.9,
          maxTokens: 2000,
          model: 'gpt-4'
        }
      };

      const updatedAgent = {
        ...mockWorkflowAgent.agent,
        ...validDto
      };

      workflowService.updateWorkflowAgent.mockResolvedValue(updatedAgent);

      const result = await controller.updateWorkflowAgent('workflow-1', 'agent-1', validDto);

      expect(workflowService.updateWorkflowAgent).toHaveBeenCalledWith(
        'workflow-1',
        'agent-1',
        validDto
      );
      expect(result.data).toEqual(updatedAgent);
    });
  });
});