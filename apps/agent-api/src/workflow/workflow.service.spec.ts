import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, Logger } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService } from '../agent/agent.service';
import { ToolsService } from '../tool/tools.service';
import { EventBus } from './event-bus';
import { CreateWorkflowDto } from './workflow.controller';
import { MockPrismaService, MockToolsService } from '../test-setup';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prismaService: MockPrismaService;
  let agentService: AgentService;
  let toolsService: MockToolsService;
  let eventBus: EventBus;

  const mockWorkflow = {
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'Test Description',
    DSL: {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A test workflow',
      version: 'v1',
      tools: ['getCurrentTime'],
      events: [
        { type: 'WORKFLOW_START', data: { input: 'string' } },
        { type: 'WORKFLOW_STOP', data: { output: 'string' } }
      ],
      steps: [
        {
          event: 'WORKFLOW_START',
          handle: 'async (event, context) => { return { type: "WORKFLOW_STOP", data: { output: event.data.input } }; }'
        }
      ]
    },
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test Agent',
    prompt: 'You are a test agent',
    options: {},
    createdById: 'workflow-system',
    deleted: false,
    isWorkflowGenerated: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTool = {
    id: 'tool-1',
    name: 'getCurrentTime',
    description: 'Get current time',
    toolkitId: 'common-toolkit-01'
  };

  beforeEach(async () => {
    const mockPrismaService = {
      workFlow: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      agent: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tool: {
        findMany: jest.fn(),
      },
      toolkit: {
        findUnique: jest.fn(),
      },
      workflowAgent: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      agentToolkit: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      agentKnowledgeBase: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      knowledgeBase: {
        findUnique: jest.fn(),
      },
    };

    const mockAgentService = {
      createAgentInstance: jest.fn(),
    };

    const mockToolsService = {
      getToolByName: jest.fn(),
      getAgentTools: jest.fn(),
    };

    const mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AgentService,
          useValue: mockAgentService,
        },
        {
          provide: ToolsService,
          useValue: mockToolsService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prismaService = module.get<MockPrismaService>(PrismaService);
    agentService = module.get<AgentService>(AgentService);
    toolsService = module.get<MockToolsService>(ToolsService);
    eventBus = module.get<EventBus>(EventBus);

  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWorkflow', () => {
    const createWorkflowDto: CreateWorkflowDto = {
      name: 'Test Workflow',
      description: 'Test Description',
      dsl: mockWorkflow.DSL,
    };

    it('should create a workflow with valid DSL', async () => {
      (prismaService.workFlow.create as jest.Mock).mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow('test-user-id', 'test-org-id', createWorkflowDto);

      expect(prismaService.workFlow.create).toHaveBeenCalledWith({
        data: {
          name: createWorkflowDto.name,
          description: createWorkflowDto.description,
          DSL: createWorkflowDto.dsl,
          createdById: 'test-user-id',
          organizationId: 'test-org-id',
        },
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw error for invalid DSL', async () => {
      const invalidDto: CreateWorkflowDto = {
        name: 'Invalid Workflow',
        description: 'Invalid DSL',
        dsl: { invalid: 'dsl' },
      };

      await expect(service.createWorkflow('test-user-id', 'test-org-id', invalidDto)).rejects.toThrow(
        'DSL missing required field: id'
      );
    });

    it('should throw error for DSL without required events', async () => {
      const invalidDto: CreateWorkflowDto = {
        name: 'Invalid Workflow',
        description: 'Missing events',
        dsl: {
          ...mockWorkflow.DSL,
          events: [{ type: 'WORKFLOW_START', data: {} }], // Missing WORKFLOW_STOP
        },
      };

      await expect(service.createWorkflow('test-user-id', 'test-org-id', invalidDto)).rejects.toThrow(
        'DSL must have at least 2 events'
      );
    });
  });

  describe('getAllWorkflows', () => {
    it('should return all non-deleted workflows', async () => {
      const mockWorkflows = [mockWorkflow];
      (prismaService.workFlow.findMany as jest.Mock).mockResolvedValue(mockWorkflows);

      const result = await service.getAllWorkflows('test-user-id', 'test-org-id');

      expect(prismaService.workFlow.findMany).toHaveBeenCalledWith({
        where: { deleted: false, createdById: 'test-user-id', organizationId: 'test-org-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('getWorkflow', () => {
    it('should return a workflow by id', async () => {
      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow);

      const result = await service.findOneWorkflow('test-user-id', 'test-org-id', 'workflow-1');

      expect(prismaService.workFlow.findUnique).toHaveBeenCalledWith({
        where: { id: 'workflow-1', deleted: false, createdById: 'test-user-id', organizationId: 'test-org-id' },
      });
      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when workflow is not found', async () => {
      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOneWorkflow('test-user-id', 'test-org-id', 'non-existent')).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );
    });
  });

  describe('deleteWorkflow', () => {
    it('should soft delete a workflow', async () => {
      const deletedWorkflow = { ...mockWorkflow, deleted: true };
      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow);
      (prismaService.workFlow.update as jest.Mock).mockResolvedValue(deletedWorkflow);

      const result = await service.deleteWorkflow('test-user-id', 'test-org-id', 'workflow-1');

      expect(prismaService.workFlow.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: { deleted: true },
      });
      expect(result).toEqual(deletedWorkflow);
    });

    it('should throw NotFoundException when workflow is not found', async () => {
      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteWorkflow('test-user-id', 'test-org-id', 'non-existent')).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );
    });
  });

  describe('fromDsl', () => {
    const simpleDsl = {
      id: 'simple-workflow',
      name: 'Simple Workflow',
      description: 'A simple test workflow',
      version: 'v1',
      tools: ['getCurrentTime'],
      events: [
        { type: 'WORKFLOW_START', data: { input: 'string' } },
        { type: 'WORKFLOW_STOP', data: { output: 'string' } }
      ],
      steps: [
        {
          event: 'WORKFLOW_START',
          handle: 'async (event, context) => { return { type: "WORKFLOW_STOP", data: { output: event.data.input } }; }'
        }
      ]
    };

    it('should create workflow from simple DSL', async () => {
      (toolsService.getToolByName as jest.Mock).mockResolvedValue(mockTool);

      const workflow = await service.fromDsl(simpleDsl);

      expect(workflow).toBeDefined();
      expect(toolsService.getToolByName).toHaveBeenCalledWith('getCurrentTime');
    });

    it('should create workflow agents from DSL with agents', async () => {
      const dslWithAgents = {
        ...simpleDsl,
        agents: [
          {
            name: 'TestAgent',
            description: 'Test agent',
            prompt: 'You are a test agent',
            output: { result: 'string' },
            tools: ['getCurrentTime']
          }
        ]
      };

      (toolsService.getToolByName as jest.Mock).mockResolvedValue(mockTool);
      (prismaService.agent.create as jest.Mock).mockResolvedValue(mockAgent);
      (agentService.createAgentInstance as jest.Mock).mockResolvedValue({});

      const workflow = await service.fromDsl(dslWithAgents, 'workflow-1');

      expect(prismaService.agent.create).toHaveBeenCalledWith({
        data: {
          name: 'workflow-1_TestAgent',
          description: 'Test agent',
          prompt: 'You are a test agent',
          options: { result: 'string' },
          createdById: 'default-user-id',
          organizationId: 'default-org-id',
          isWorkflowGenerated: true,
        },
      });
      expect(agentService.createAgentInstance).toHaveBeenCalled();
    });

    it('should reuse existing workflow agent', async () => {
      const dslWithAgents = {
        ...simpleDsl,
        agents: [
          {
            name: 'TestAgent',
            description: 'Test agent',
            prompt: 'You are a test agent',
            output: { result: 'string' },
            tools: ['getCurrentTime']
          }
        ]
      };

      const existingWorkflowAgent = {
        workflowId: 'workflow-1',
        agentId: 'agent-1',
        agentName: 'TestAgent',
        agent: mockAgent
      };

      (toolsService.getToolByName as jest.Mock).mockResolvedValue(mockTool);
      (prismaService.workflowAgent.findUnique as jest.Mock).mockResolvedValue(existingWorkflowAgent);
      (agentService.createAgentInstance as jest.Mock).mockResolvedValue({});

      const workflow = await service.fromDsl(dslWithAgents, 'workflow-1');

      expect(prismaService.workflowAgent.findUnique).toHaveBeenCalledWith({
        where: {
          workflowId_agentName: {
            workflowId: 'workflow-1',
            agentName: 'TestAgent',
          },
        },
        include: {
          agent: true,
        },
      });
      expect(prismaService.agent.create).not.toHaveBeenCalled();
    });

    it('should handle agent with knowledge bases', async () => {
      const dslWithKnowledgeBases = {
        ...simpleDsl,
        agents: [
          {
            name: 'TestAgent',
            description: 'Test agent',
            prompt: 'You are a test agent',
            output: { result: 'string' },
            tools: ['getCurrentTime'],
            knowledgeBases: ['kb-1']
          }
        ]
      };

      (toolsService.getToolByName as jest.Mock).mockResolvedValue(mockTool);
      (prismaService.agent.create as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.agentKnowledgeBase.create as jest.Mock).mockResolvedValue({});
      (prismaService.agentToolkit.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.agentToolkit.create as jest.Mock).mockResolvedValue({});
      (toolsService.getAgentTools as jest.Mock).mockResolvedValue([]);
      (agentService.createAgentInstance as jest.Mock).mockResolvedValue({});

      const workflow = await service.fromDsl(dslWithKnowledgeBases);

      expect(prismaService.agentKnowledgeBase.create).toHaveBeenCalledWith({
        data: {
          agentId: mockAgent.id,
          knowledgeBaseId: 'kb-1',
        },
      });
      expect(prismaService.agentToolkit.create).toHaveBeenCalledWith({
        data: {
          agentId: mockAgent.id,
          toolkitId: 'knowledge-base-toolkit-01',
          settings: { agentId: mockAgent.id },
        },
      });
    });
  });

  describe('getCreateDSLWorkflow', () => {
    it('should create DSL generation workflow', async () => {
      const dslSchema = { version: 'v1' };
      const userMessage = 'Create a time workflow';

      (prismaService.tool.findMany as jest.Mock).mockResolvedValue([mockTool]);
      (agentService.createAgentInstance as jest.Mock).mockResolvedValue({
        run: jest.fn().mockResolvedValue({
          data: { result: JSON.stringify(mockWorkflow.DSL) }
        })
      });

      const workflow = await service.createDslGeneratorWorkflow(dslSchema, userMessage);

      expect(workflow).toBeDefined();
      expect(prismaService.tool.findMany).toHaveBeenCalledWith({
        where: {
          toolkitId: 'tool-explorer-toolkit-01',
        },
      });
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a workflow', async () => {
      const input = { test: 'data' };
      const context = { session: 'test' };

      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(mockWorkflow);
      (toolsService.getToolByName as jest.Mock).mockResolvedValue(mockTool);

      // Mock workflow execution result
      const mockWorkflowInstance = {
        execute: jest.fn().mockResolvedValue({ output: 'test result' })
      };

      // We need to mock the fromDsl method to return our mock workflow
      jest.spyOn(service, 'fromDsl' as keyof WorkflowService).mockResolvedValue(mockWorkflowInstance as any);

      const result = await service.executeWorkflow('test-user-id', 'test-org-id', 'workflow-1', input, context);

      expect(result).toEqual({
        workflowId: 'workflow-1',
        input,
        output: { output: 'test result' },
        executedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException when workflow is not found', async () => {
      (prismaService.workFlow.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.executeWorkflow('test-user-id', 'test-org-id', 'non-existent', {}, undefined)).rejects.toThrow(
        new NotFoundException('Workflow with id non-existent not found')
      );
    });
  });

  describe('getWorkflowAgents', () => {
    it('should return workflow agents', async () => {
      const mockWorkflowAgents = [
        {
          workflowId: 'workflow-1',
          agentId: 'agent-1',
          agentName: 'TestAgent',
          agent: {
            ...mockAgent,
            agentKnowledgeBases: [],
            agentToolkits: []
          }
        }
      ];

      (prismaService.workflowAgent.findMany as jest.Mock).mockResolvedValue(mockWorkflowAgents);

      const result = await service.getWorkflowAgents('workflow-1');

      expect(prismaService.workflowAgent.findMany).toHaveBeenCalledWith({
        where: { workflowId: 'workflow-1' },
        include: {
          agent: {
            include: {
              agentKnowledgeBases: {
                include: {
                  knowledgeBase: true,
                },
              },
              agentToolkits: {
                include: {
                  toolkit: true,
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockWorkflowAgents);
    });
  });

  describe('deleteWorkflowAgents', () => {
    it('should delete workflow agents', async () => {
      const mockWorkflowAgents = [
        {
          workflowId: 'workflow-1',
          agentId: 'agent-1',
          agentName: 'TestAgent',
          agent: mockAgent
        }
      ];

      (prismaService.workflowAgent.findMany as jest.Mock).mockResolvedValue(mockWorkflowAgents);
      (prismaService.agent.delete as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.workflowAgent.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.deleteWorkflowAgents('workflow-1');

      expect(prismaService.agent.delete).toHaveBeenCalledWith({
        where: { id: 'agent-1' },
      });
      expect(prismaService.workflowAgent.deleteMany).toHaveBeenCalledWith({
        where: { workflowId: 'workflow-1' },
      });
    });
  });

  describe('validateDsl', () => {
    it('should validate valid DSL', () => {
      expect(() => service['validateDsl'](mockWorkflow.DSL)).not.toThrow();
    });

    it('should throw error for invalid DSL object', () => {
      expect(() => service['validateDsl'](null)).toThrow('DSL must be a valid object');
      expect(() => service['validateDsl']('string')).toThrow('DSL must be a valid object');
    });

    it('should throw error for DSL missing required fields', () => {
      const invalidDsl = { name: 'Test' };
      expect(() => service['validateDsl'](invalidDsl)).toThrow('DSL missing required field: id');
    });

    it('should throw error for DSL with insufficient events', () => {
      const invalidDsl = {
        ...mockWorkflow.DSL,
        events: [{ type: 'WORKFLOW_START', data: {} }]
      };
      expect(() => service['validateDsl'](invalidDsl)).toThrow('DSL must have at least 2 events');
    });

    it('should throw error for DSL without WORKFLOW_START event', () => {
      const invalidDsl = {
        ...mockWorkflow.DSL,
        events: [
          { type: 'CUSTOM_EVENT', data: {} },
          { type: 'WORKFLOW_STOP', data: {} }
        ]
      };
      expect(() => service['validateDsl'](invalidDsl)).toThrow('DSL must have WORKFLOW_START event');
    });

    it('should throw error for DSL without steps', () => {
      const invalidDsl = {
        ...mockWorkflow.DSL,
        steps: []
      };
      expect(() => service['validateDsl'](invalidDsl)).toThrow('DSL must have at least 1 step');
    });
  });
});