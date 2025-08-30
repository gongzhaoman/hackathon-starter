# 多租户架构规范文档

## 概述

本文档定义了智能体平台的多租户架构规范，包括认证、授权、数据隔离和API设计标准。

## 架构原则

### 1. 数据隔离策略

**租户隔离层级：**

- **用户级别**: 每个用户只能访问自己创建的资源
- **组织级别**: 组织成员可以访问组织内的共享资源
- **系统级别**: 系统资源（如基础工具包）对所有租户可见

**数据模型设计：**

```typescript
// 所有业务实体必须包含以下字段
interface MultiTenantEntity {
  createdById: string;        // 创建者ID（必需）
  organizationId: string;     // 组织ID（必需）
}

// 例外：系统级资源
interface SystemEntity {
  organizationId?: string;    // 系统资源可以为空
}
```

### 2. 认证与授权

**Better Auth 集成规范：**

```typescript
// 用户会话类型定义
export interface SessionWithOrganization extends Session {
  activeOrganizationId?: string;
  activeOrgRole?: string;
}

// 控制器用户上下文
export interface CurrentUserData {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
  organizationRole?: string;
}
```

**权限控制模式：**

- 使用 `@UseGuards(AuthGuard)` 保护所有业务API
- 通过 `@CurrentUser()` 装饰器获取用户上下文
- 在服务层进行数据访问权限验证

## API 设计规范

### 1. 服务层方法签名标准

**命名规范：**
- 使用语义化的参数名，避免使用通用的 `id`
- 资源ID使用 `{resourceType}Id` 格式（如 `agentId`, `workflowId`, `knowledgeBaseId`）
- 用户上下文参数始终在前：`userId`, `organizationId`

**通用CRUD操作签名：**

```typescript
// 查询类方法 - 使用语义化参数名
async findAll(userId: string, organizationId: string | undefined): Promise<T[]>
async findAllPaginated(userId: string, organizationId: string | undefined, params: PaginationParams): Promise<PaginatedResult<T>>

// 具体资源查询方法
async findOneAgent(userId: string, organizationId: string | undefined, agentId: string): Promise<Agent>
async findOneWorkflow(userId: string, organizationId: string | undefined, workflowId: string): Promise<Workflow>
async findOneKnowledgeBase(userId: string, organizationId: string | undefined, knowledgeBaseId: string): Promise<KnowledgeBase>
async findOneConversation(userId: string, organizationId: string | undefined, conversationId: string): Promise<Conversation>

// 写入类方法 - 明确资源类型
async createAgent(userId: string, organizationId: string | undefined, dto: CreateAgentDto): Promise<Agent>
async updateAgent(userId: string, organizationId: string | undefined, agentId: string, dto: UpdateAgentDto): Promise<Agent>
async removeAgent(userId: string, organizationId: string | undefined, agentId: string): Promise<void>

async createWorkflow(userId: string, organizationId: string | undefined, dto: CreateWorkflowDto): Promise<Workflow>
async updateWorkflow(userId: string, organizationId: string | undefined, workflowId: string, dto: UpdateWorkflowDto): Promise<Workflow>
async removeWorkflow(userId: string, organizationId: string | undefined, workflowId: string): Promise<void>

async createKnowledgeBase(userId: string, organizationId: string | undefined, name: string, description: string): Promise<KnowledgeBase>
async updateKnowledgeBase(userId: string, organizationId: string | undefined, knowledgeBaseId: string, dto: UpdateKnowledgeBaseDto): Promise<KnowledgeBase>
async deleteKnowledgeBase(userId: string, organizationId: string | undefined, knowledgeBaseId: string): Promise<void>
```

**业务操作方法：**

```typescript
// Agent 业务操作
async chatWithAgent(userId: string, organizationId: string | undefined, agentId: string, chatDto: ChatWithAgentDto): Promise<ChatResponse>
async getAgentToolkits(userId: string, organizationId: string | undefined, agentId: string): Promise<AgentToolkit[]>
async processAgentMessage(userId: string, organizationId: string | undefined, agentId: string, messages: Message[]): Promise<AgentResponse>

// Workflow 业务操作
async executeWorkflow(userId: string, organizationId: string | undefined, workflowId: string, input: any): Promise<WorkflowResult>
async getWorkflowAgents(userId: string, organizationId: string | undefined, workflowId: string): Promise<WorkflowAgent[]>

// Conversation 业务操作
async createConversation(userId: string, organizationId: string | undefined, data: { agentId: string; title?: string }): Promise<Conversation>
async addMessageToConversation(userId: string, organizationId: string | undefined, conversationId: string, messageData: MessageData): Promise<Message>
async processConversationMessage(userId: string, organizationId: string | undefined, conversationId: string, userMessage: string): Promise<ProcessResult>
async getConversationsByAgent(userId: string, organizationId: string | undefined, agentId: string, limit?: number): Promise<Conversation[]>

// KnowledgeBase 业务操作
async uploadFileToKnowledgeBase(userId: string, organizationId: string | undefined, knowledgeBaseId: string, file: any): Promise<FileResponse>
async queryKnowledgeBase(userId: string, organizationId: string | undefined, knowledgeBaseId: string, query: string): Promise<QueryResult>
async linkKnowledgeBaseToAgent(userId: string, organizationId: string | undefined, knowledgeBaseId: string, agentId: string): Promise<void>
```

### 2. 控制器层标准

**认证和权限控制：**

```typescript
@Controller('resource')
@UseGuards(AuthGuard)  // 必须添加认证守卫
export class ResourceController {

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,  // 用户上下文
    @Body() dto: CreateResourceDto
  ) {
    const result = await this.service.create(user.id, user.organizationId, dto);
    return ResponseBuilder.created(result, '创建成功');
  }
}
```

### 3. 数据访问权限验证

**服务层权限检查模式：**

```typescript
// 在所有findOne/update/delete操作中进行权限验证
async findOne(userId: string, organizationId: string | undefined, id: string) {
  const entity = await this.prisma.entity.findUnique({
    where: {
      id,
      createdById: userId,  // 用户级别权限
      ...(organizationId && { organizationId }),  // 组织级别权限
    }
  });

  if (!entity) {
    throw new NotFoundException('资源不存在或无权限访问');
  }

  return entity;
}
```

## Better Auth 集成规范

### 1. 类型定义优化

**会话类型扩展：**

```typescript
// auth.config.ts
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
export type Organization = typeof auth.$Infer.Organization;

// 扩展会话以包含组织信息
export interface EnhancedSession extends Session {
  activeOrganizationId?: string;
  activeOrgRole?: string;
}
```

**用户上下文类型：**

```typescript
// current-user.decorator.ts
export interface CurrentUserData {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
  organizationRole?: string;
}
```

### 2. 认证守卫优化

**改进认证流程：**

- 使用Better Auth的原生API进行会话验证
- 正确处理组织上下文和角色信息
- 提供类型安全的用户上下文

### 3. 权限控制策略

**多级权限模型：**

- **资源所有者**: 完全控制权限
- **组织成员**: 基于角色的访问权限
- **系统管理员**: 跨组织访问权限

## 重构执行计划

### 阶段1: 核心架构修复

1. 修复seed.ts数据类型错误
2. 完善agent.service.ts剩余方法
3. 重构workflow.service.ts核心方法

### 阶段2: 服务层全面重构

1. 重构knowledge-base.service.ts
2. 重构conversation.service.ts
3. 重构scheduled-task.service.ts
4. 重构toolkits.service.ts

### 阶段3: 控制器层统一

1. 为所有控制器添加认证守卫
2. 更新所有方法以使用用户上下文
3. 统一响应格式和错误处理

### 阶段4: 测试和验证

1. 修复所有测试文件的方法签名
2. 添加多租户权限测试用例
3. 运行完整的类型检查和测试套件

### 阶段5: Better Auth优化

1. 完善类型定义
2. 优化会话处理逻辑
3. 添加组织管理功能

## 文件更新清单

**核心文件：**

- `docs/MULTI_TENANT_ARCHITECTURE.md` (新建)
- `prisma/seed.ts` (修复类型)
- `src/auth/*` (优化Better Auth集成)

**服务层：**

- `src/agent/agent.service.ts`
- `src/workflow/workflow.service.ts`
- `src/knowledge-base/knowledge-base.service.ts`
- `src/conversation/conversation.service.ts`
- `src/scheduled-task/scheduled-task.service.ts`
- `src/tool/toolkits.service.ts`

**控制器层：**

- `src/workflow/workflow.controller.ts`
- `src/conversation/conversation.controller.ts`
- `src/scheduled-task/scheduled-task.controller.ts`
- `src/tool/toolkits.controller.ts`

**测试文件：**

- 所有 `*.spec.ts` 文件需要更新方法调用签名

此重构将确保系统完全支持多租户架构，同时保持代码的类型安全和一致性。
