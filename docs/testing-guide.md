# 测试规范与实践

## 测试分层策略

### 服务层测试重点

```typescript
// 测试业务逻辑，返回原始数据 (agent.service.spec.ts)
describe('AgentService', () => {
  it('should create agent with auto toolkit assignment', async () => {
    const mockAgent = createMockAgent();
    mockPrisma.agent.create.mockResolvedValue(mockAgent);

    const result = await service.create(createAgentDto);

    // 测试原始数据返回
    expect(result).toEqual(mockAgent);
    expect(mockToolsService.assignToolkitToAgent).toHaveBeenCalledWith(
      mockAgent.id,
      'common-toolkit-id',
      {}
    );
  });
});
```

### 控制器层测试重点

```typescript
// 测试ResponseBuilder包装和HTTP层 (agent.controller.spec.ts)
describe('AgentController', () => {
  it('should return wrapped response', async () => {
    const mockAgents = [createMockAgent()];
    mockAgentService.findAll.mockResolvedValue(mockAgents);

    const result = await controller.findAll();

    // 测试ResponseBuilder包装
    expect((result as DataResponse<Agent[]>).success).toBe(true);
    expect((result as DataResponse<Agent[]>).data).toEqual(mockAgents);
  });
});
```

## 权限测试模式

### 知识库权限测试

```typescript
// 测试权限边界 (knowledge-base.service.spec.ts)
describe('query with permissions', () => {
  it('should allow access when agent has permission', async () => {
    mockPrisma.agentKnowledgeBase.findUnique.mockResolvedValue({
      agentId: 'agent-1',
      knowledgeBaseId: 'kb-1'
    });

    await expect(
      service.query('kb-1', 'test query', 'agent-1')
    ).resolves.not.toThrow();
  });

  it('should deny access when agent lacks permission', async () => {
    mockPrisma.agentKnowledgeBase.findUnique.mockResolvedValue(null);

    await expect(
      service.query('kb-1', 'test query', 'agent-1')
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### 工具集权限测试

```typescript
// 测试工具集权限传递
describe('toolkit permissions', () => {
  it('should pass agent context to tools', async () => {
    const toolkit = new KnowledgeBaseToolkit();
    toolkit.settings = { agentId: 'test-agent' };

    const tools = await toolkit.getTools();

    // 验证工具继承了智能体上下文
    expect(tools[0].metadata.agentId).toBe('test-agent');
  });
});
```

## 异步处理测试

### 文件处理异步测试

```typescript
// 测试异步文件处理 (knowledge-base.service.spec.ts)
describe('file processing', () => {
  it('should handle file upload asynchronously', async () => {
    const mockFile = { originalname: 'test.txt' } as Express.Multer.File;

    const result = await service.uploadFile('kb-1', mockFile);

    // 立即返回文件记录
    expect(result.status).toBe(FileStatus.PENDING);

    // 异步处理不应阻塞响应
    expect(mockPrisma.file.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: FileStatus.PENDING
      })
    });
  });
});
```

### 工作流执行测试

```typescript
// 测试事件驱动工作流
describe('workflow execution', () => {
  it('should execute workflow steps in sequence', async () => {
    const mockDSL = {
      steps: [
        { trigger: { type: 'workflow_start' }, action: { type: 'agent_call' } }
      ]
    };

    const workflow = await service.fromDsl(mockDSL);

    // 模拟事件发布
    eventBus.publish('workflow_start', { input: 'test' });

    // 验证步骤执行
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockAgentService.chat).toHaveBeenCalled();
  });
});
```

## Mock设计模式

### 类型安全Mock

```typescript
// 全局Mock工厂 (test-setup.ts)
export const createMockAgent = (overrides?: Partial<Agent>): Agent => ({
  id: 'mock-agent-id',
  name: 'Mock Agent',
  description: 'Mock Description',
  prompt: 'You are a helpful assistant',
  options: {},
  isWorkflowGenerated: false,
  deleted: false,
  createdAt: mockDate,
  updatedAt: mockDate,
  ...overrides,
});

// 在测试中使用
const agent = createMockAgent({ name: 'Custom Agent' });
```

### 服务Mock模式

```typescript
// 服务依赖Mock (agent.service.spec.ts)
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AgentService,
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
      {
        provide: ToolsService,
        useValue: mockToolsService,
      },
    ],
  }).compile();

  service = module.get<AgentService>(AgentService);
});
```

## 测试数据管理

### 测试隔离

```typescript
// 每个测试清理Mock状态
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
```

### 一致性测试数据

```typescript
// 使用工厂函数确保数据一致性
const createTestWorkflow = () => ({
  id: 'test-workflow',
  name: 'Test Workflow',
  DSL: {
    agents: [{ name: 'test_agent', prompt: 'Test prompt' }],
    steps: [{ trigger: { type: 'workflow_start' } }]
  }
});
```

## 性能测试指标

### 测试运行时间要求

```typescript
// 超时配置
describe('expensive operations', () => {
  it('should complete within time limit', async () => {
    const start = Date.now();

    await service.expensiveOperation();

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5秒内完成
  }, 10000); // 10秒超时
});
```

### 内存泄漏检测

```typescript
// 检测事件监听器清理
describe('event cleanup', () => {
  it('should clean up event listeners', async () => {
    const workflow = await service.fromDsl(mockDSL);

    const initialListeners = eventBus.listenerCount('test_event');
    workflow.destroy();
    const finalListeners = eventBus.listenerCount('test_event');

    expect(finalListeners).toBeLessThanOrEqual(initialListeners);
  });
});
```
