# 后端核心业务架构

## 智能体权限系统设计

### 权限模型

```typescript
// 三级权限控制
Agent -> AgentToolkit -> Tool
Agent -> AgentKnowledgeBase -> KnowledgeBase

// 数据库约束确保权限一致性
CREATE UNIQUE INDEX agent_toolkit_unique ON agent_toolkits(agent_id, toolkit_id);
CREATE UNIQUE INDEX agent_kb_unique ON agent_knowledge_bases(agent_id, knowledge_base_id);
```

### 权限检查实现

```typescript
// 知识库访问权限检查 (knowledge-base.service.ts:145)
async query(knowledgeBaseId: string, query: string, agentId?: string) {
  if (agentId) {
    const hasAccess = await this.prisma.agentKnowledgeBase.findUnique({
      where: { agentId_knowledgeBaseId: { agentId, knowledgeBaseId } }
    });
    if (!hasAccess) {
      throw new ForbiddenException('智能体无权限访问该知识库');
    }
  }
  // 执行查询...
}
```

### 工具集权限传递

```typescript
// 工具集设置中包含智能体ID (base-toolkit.ts)
export abstract class BaseToolkit {
  abstract settings: { agentId?: string };

  // 工具继承智能体权限
  protected getAgentId(): string | undefined {
    return this.settings.agentId;
  }
}
```

## 工作流DSL引擎

### DSL结构设计

```json
{
  "agents": [
    { "name": "data_analyst", "prompt": "你是数据分析专家" }
  ],
  "tools": ["common-toolkit", "knowledge-base-toolkit"],
  "steps": [
    {
      "trigger": { "type": "workflow_start" },
      "action": {
        "type": "agent_call",
        "agent": "data_analyst",
        "input": "${input.query}"
      }
    }
  ]
}
```

### 事件驱动执行

```typescript
// 工作流事件总线 (event-bus.ts)
export class EventBus {
  private subjects = new Map<string, Subject<any>>();

  publish<T>(eventType: string, data: T, instanceId?: string): void {
    const event = new WorkflowEvent(eventType, data, instanceId);
    this.getSubject(eventType).next(event);
  }
}

// 工作流步骤处理 (workflow.ts)
addStep<TEvent = any>(step: WorkflowStep<TContext, TEvent>) {
  const subscription = this.eventBus.subscribe(
    step.eventType,
    async (event: WorkflowEvent<TEvent>) => {
      if (event.instanceId === this.instanceId) {
        const nextEvent = await step.handle(event, context);
        if (nextEvent) {
          this.eventBus.publish(nextEvent.type, nextEvent.data);
        }
      }
    }
  );
}
```

### 上下文管理

```typescript
// 工作流上下文存储 (workflow.context.ts)
export class WorkflowContextStorage {
  private static storage = new Map<string, any>();

  static run<T>(instanceId: string, context: any, callback: () => Promise<T>): Promise<T> {
    this.storage.set(instanceId, context);
    try {
      return callback();
    } finally {
      this.storage.delete(instanceId);
    }
  }
}
```

## 工具集动态注册机制

### 装饰器注册

```typescript
// 工具集注册装饰器 (toolkits.decorator.ts)
export const ToolkitId = (id: string) => SetMetadata(TOOLKIT_ID_KEY, id);

// 使用装饰器
@ToolkitId('knowledge-base-toolkit')
@Injectable()
export class KnowledgeBaseToolkit extends BaseToolkit {
  name = '知识库工具';
}
```

### 自动发现

```typescript
// 工具集发现服务 (toolkits.service.ts:52)
private discoverToolkits() {
  const providers = this.discoveryService.getProviders();
  for (const wrapper of providers) {
    const { metatype } = wrapper;
    const toolkitId = this.reflector.get(TOOLKIT_ID_KEY, metatype);
    if (toolkitId) {
      this.toolkitMap.set(toolkitId, metatype as Type<Toolkit>);
      this.logger.log(`发现工具集: ${toolkitId}`);
    }
  }
}
```

### 异步初始化

```typescript
// 基础工具集异步初始化 (base-toolkit.ts:15)
export abstract class BaseToolkit implements Toolkit {
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.safeInitTools();
  }

  async getTools(): Promise<ToolsType[]> {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
    return this.tools;
  }
}
```

## 向量数据库集成

### 文件处理流程

```typescript
// 异步文件处理 (knowledge-base.service.ts:89)
async uploadFile(knowledgeBaseId: string, file: Express.Multer.File) {
  // 1. 立即创建文件记录
  const fileRecord = await this.prisma.file.create({
    data: {
      name: file.originalname,
      path: savedPath,
      status: FileStatus.PENDING,
      knowledgeBaseId,
    }
  });

  // 2. 异步处理文件（不阻塞响应）
  this.processFileAsync(fileRecord.id, knowledgeBaseId);

  return fileRecord;
}

private async processFileAsync(fileId: string, knowledgeBaseId: string) {
  try {
    await this.updateFileStatus(fileId, FileStatus.PROCESSING);
    const documents = await this.parseAndIndexFile(fileId, knowledgeBaseId);
    await this.updateFileStatus(fileId, FileStatus.PROCESSED);
  } catch (error) {
    await this.updateFileStatus(fileId, FileStatus.FAILED);
  }
}
```

### 向量存储集成

```typescript
// LlamaIndex集成 (llamaindex.service.ts)
async createVectorStore(vectorStoreName: string) {
  const Settings = await this.getSettings();
  Settings.vectorStore = new PGVectorStore({
    connectionString: this.configService.get('DATABASE_URL'),
    tableName: vectorStoreName,
  });

  return Settings.vectorStore;
}
```

## API响应标准化

### 分层响应架构

```typescript
// 1. 服务层返回原始数据
export class AgentService {
  async findAll(): Promise<Agent[]> {
    return this.prisma.agent.findMany({ where: { deleted: false } });
  }
}

// 2. 控制器层使用ResponseBuilder包装
export class AgentController {
  async findAll(): Promise<DataResponse<Agent[]>> {
    const agents = await this.agentService.findAll();
    return ResponseBuilder.success(agents, '获取智能体列表成功');
  }
}

// 3. 全局拦截器处理HTTP状态
export class ResponseInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        if (data?.success === false) {
          throw new HttpException(data.error, HttpStatus.BAD_REQUEST);
        }
        return data;
      })
    );
  }
}
```

### 统一错误处理

```typescript
// 全局异常过滤器 (http-exception.filter.ts)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();

    response.status(status).json({
      success: false,
      error: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 定时任务系统

### Cron表达式调度

```typescript
// 定时任务服务 (scheduled-task.service.ts)
export class ScheduledTaskService {
  private jobs = new Map<string, ScheduledJob>();

  async createTask(dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    const task = await this.prisma.scheduledTask.create({ data: dto });

    // 立即调度任务
    this.scheduleJob(task);
    return task;
  }

  private scheduleJob(task: ScheduledTask) {
    const job = schedule.scheduleJob(task.cronExpression, async () => {
      await this.executeTask(task.id);
    });
    this.jobs.set(task.id, job);
  }

  private async executeTask(taskId: string) {
    const task = await this.prisma.scheduledTask.findUnique({
      where: { id: taskId }
    });

    if (task && task.enabled) {
      // 执行工作流
      await this.workflowService.executeWorkflow(task.workflowId, task.input);
    }
  }
}
```

### 任务状态管理

```typescript
// 任务执行记录
model TaskExecution {
  id        String   @id @default(cuid())
  taskId    String
  status    ExecutionStatus
  startedAt DateTime @default(now())
  endedAt   DateTime?
  output    Json?
  error     String?

  task      ScheduledTask @relation(fields: [taskId], references: [id])
}
```

## 业务规则实现

### 智能体创建规则

```typescript
// 自动分配通用工具集 (agent.service.ts:67)
async create(createAgentDto: CreateAgentDto): Promise<Agent> {
  const agent = await this.prisma.agent.create({
    data: createAgentDto
  });

  // 自动分配通用工具集
  const commonToolkit = await this.toolsService.findToolkitByName('common-toolkit');
  if (commonToolkit) {
    await this.assignToolkitToAgent(agent.id, commonToolkit.id, {});
  }

  return agent;
}
```

### 工作流智能体隔离

```typescript
// 工作流生成的智能体不显示在列表中 (agent.service.ts:23)
async findAll(): Promise<Agent[]> {
  return this.prisma.agent.findMany({
    where: {
      deleted: false,
      isWorkflowGenerated: false  // 隐藏工作流生成的临时智能体
    }
  });
}
```

### 软删除机制

```typescript
// 软删除保护数据完整性
async remove(id: string): Promise<void> {
  await this.prisma.agent.update({
    where: { id },
    data: { deleted: true }  // 标记删除，不物理删除
  });
}
```
