# CLAUDE.md - 智能体平台开发指南

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供开发流程指导。

## ⚡ 标准开发流程（重要）

**每次进行代码修改时必须严格按照以下顺序执行：**

### 1. 开发环境准备

```bash
# 启动开发环境
docker compose up --build -d

# 检查服务状态
docker compose ps
```

### 2. 代码修改流程

1. **修改代码** - 进行必要的功能开发或bug修复
2. **类型检查** - `pnpm --filter agent-api typecheck`
3. **运行测试** - `pnpm --filter agent-api test`（必须通过）
4. **代码检查** - `pnpm --filter agent-api lint`
5. **手动验证** - 确认功能正常工作

### 3. 文档更新流程

**完成代码开发后，必须按顺序更新以下文档：**

1. **更新英文README** - 如有新功能或命令变更
2. **更新中文README** - 保持与英文版本同步
3. **更新docs目录** - 更新相关技术文档（架构指南、测试指南等）
4. **更新CLAUDE.md** - 如有开发流程或命令变更

### 4. 提交前检查

```bash
# 最终检查（所有命令必须成功）
pnpm --filter agent-api typecheck
pnpm --filter agent-api test
pnpm --filter agent-api lint
```

## 📋 开发命令参考

### 根目录命令 (Turborepo)

- `pnpm dev` - 启动所有应用的开发模式
- `pnpm build` - 构建所有应用
- `pnpm lint` - 检查所有应用代码
- `pnpm format` - 使用Prettier格式化代码

### 应用特定命令

- `pnpm --filter agent-api <command>` - 在agent-api中运行命令
- `pnpm --filter agent-web <command>` - 在agent-web中运行命令

### Agent API (NestJS) 命令

- `pnpm --filter agent-api dev` - 启动API监听模式
- `pnpm --filter agent-api build` - 构建API
- `pnpm --filter agent-api test` - 运行单元测试
- `pnpm --filter agent-api test:e2e` - 运行端到端测试
- `pnpm --filter agent-api typecheck` - 类型检查
- `pnpm --filter agent-api lint` - 代码检查并自动修复

### 数据库命令

- `pnpm --filter agent-api db:generate` - 生成Prisma客户端
- `pnpm --filter agent-api db:migrate` - 运行数据库迁移
- `pnpm --filter agent-api db:push` - 推送模式变更
- `pnpm --filter agent-api db:studio` - 打开Prisma Studio
- `pnpm --filter agent-api db:seed` - 初始化数据库
- `pnpm --filter agent-api db:reset` - 重置并重新初始化数据库

### Agent Web (React + Vite) 命令

- `pnpm --filter agent-web dev` - 启动Web应用开发模式
- `pnpm --filter agent-web build` - 构建Web应用
- `pnpm --filter agent-web typecheck` - 类型检查
- `pnpm --filter agent-web lint` - ESLint代码检查

### Docker 开发命令

- `docker compose up --build -d` - 启动完整的Docker开发环境
- `docker compose ps` - 检查服务状态
- `docker compose down` - 停止所有服务
- `docker compose logs -f <service>` - 查看服务日志

## 🏗️ 系统架构概览

### Monorepo 架构

基于 Turborepo 的 Monorepo 架构，包含以下结构：

- **apps/agent-api**: 基于 Prisma ORM 的 NestJS 后端 API
- **apps/agent-web**: 基于 Vite 的 React 前端
- **packages/**: 共享包（UI组件、配置）

### Agent API (后端)

使用 NestJS 框架构建的模块化架构：

**核心模块：**

- **AgentModule** (`src/agent/`): 管理AI智能体及其配置
- **WorkflowModule** (`src/workflow/`): 处理基于DSL的工作流执行
- **ToolsModule** (`src/tool/`): 管理工具集和单个工具
- **KnowledgeBaseModule** (`src/knowledge-base/`): RAG向量数据库集成
- **LlamaIndexModule** (`src/llamaindex/`): LlamaIndex AI工作流集成
- **PrismaModule** (`src/prisma/`): PostgreSQL + pgvector 数据库层

**核心功能：**

- 基于智能体的架构，支持可配置工具集
- 复杂多智能体编排的工作流DSL
- 基于向量存储的知识库管理
- 工具探索和动态工具集注册
- 使用 ResponseBuilder 的统一 API 响应格式
- HTTP标准化的全局响应拦截器
- 基于权限的知识库访问控制

**API 响应架构：**

API 使用分层响应架构：

1. **服务层**: 返回原始数据对象
2. **控制器层**: 使用 `ResponseBuilder` 工具包装数据
3. **响应拦截器**: 处理HTTP状态码和最终格式化

所有 API 响应遵循标准格式：

```typescript
interface DataResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}
```

### 数据库架构

使用 PostgreSQL 配合 pgvector 扩展：

- **Agent**: 核心智能体配置，包含提示词和选项
- **Toolkit/Tool**: 模块化工具系统，支持JSON schema验证
- **Workflow**: 基于DSL的工作流定义，关联智能体
- **KnowledgeBase**: RAG向量存储，支持文件管理
- **AgentToolkit/AgentTool/AgentKnowledgeBase**: 多对多关系表

**权限架构：**

系统实现细粒度访问控制：

1. **智能体-工具集关系**: 通过 `AgentToolkit` 配置设置
2. **智能体-知识库访问**: 通过 `AgentKnowledgeBase` 管理，具有唯一约束
3. **工具权限**: 工具通过工具集关联继承智能体权限

**知识库访问控制：**

```typescript
// 权限检查使用数据库唯一约束提高效率
const hasAccess = await prisma.agentKnowledgeBase.findUnique({
  where: {
    agentId_knowledgeBaseId: { agentId, knowledgeBaseId }
  }
});
```

### Agent Web (前端)

React 应用包含：

- **React Query**: 服务端状态管理
- **React Router**: 客户端路由
- **Tailwind CSS**: 样式框架
- **Radix UI**: 组件原语

**核心页面：**

- `Dashboard.tsx`: 主概览页面
- `Agents.tsx`: 智能体管理
- `Workflows.tsx`: 工作流构建器/运行器
- `KnowledgeBases.tsx`: 知识库管理
- `Toolkits.tsx`: 工具管理
- `AgentChat.tsx`: 聊天界面

## 🔧 开发环境

### 环境要求

- Node.js >= 20
- PNPM (包管理器)
- Docker & Docker Compose

### 环境配置

1. 使用 `docker compose up --build -d` 进行容器化开发（推荐）
2. 服务运行端口：
   - Agent API: <http://localhost:3001>
   - Agent Web: <http://localhost:5173>
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### 测试策略

**测试组织：**

- **服务测试** (`*.service.spec.ts`): 测试业务逻辑和数据操作
- **控制器测试** (`*.controller.spec.ts`): 测试HTTP层和响应格式化
- **集成测试** (`apps/agent-api/test/`): 测试完整的请求/响应周期
- **端到端测试**: 测试完整用户工作流

**运行测试：**

- `pnpm --filter agent-api test` - 运行所有单元测试
- `pnpm --filter agent-api test:e2e` - 运行端到端测试
- `pnpm --filter agent-api test <file>` - 运行特定测试文件
- `pnpm --filter agent-api test:cov` - 运行测试并生成覆盖率报告

**测试最佳实践：**

1. **服务层测试**:

   ```typescript
   // 测试原始数据返回
   expect(result).toEqual(expectedData);
   ```

2. **控制器层测试**:

   ```typescript
   // 测试 ResponseBuilder 包装的响应
   expect((result as DataResponse<any>).data).toEqual(expectedData);
   expect(result.success).toBe(true);
   ```

3. **Mock 设置**:
   - Mock 外部依赖（Prisma、HTTP客户端）
   - 使用 Jest 的类型安全 Mock
   - 在测试间重置 Mock

4. **权限测试**:
   - 测试授权和未授权访问场景
   - 验证错误响应匹配预期格式

### 代码质量

- 通过 `@workspace/eslint-config` 共享 ESLint 配置
- 通过 `@workspace/typescript-config` 共享 TypeScript 配置
- 使用 Prettier 进行代码格式化
- 提交前必须运行 `typecheck` 和 `lint`

## 🛠️ 工具集开发指南

### 创建新工具集

1. **继承 BaseToolkit**:

   ```typescript
   @toolkitId('my-toolkit-01')
   export class MyToolkit extends BaseToolkit {
     name = 'My Custom Toolkit';
     description = 'Description of toolkit functionality';
     settings = { /* toolkit-specific settings */ };
     tools: ToolsType[] = [];
   }
   ```

2. **实现必需方法**:

   ```typescript
   validateSettings(): void {
     // 验证工具集设置
   }

   protected async initTools(): Promise<void> {
     // 异步初始化工具
     const FunctionTool = await this.llamaindexService.getFunctionTool();
     this.tools = [/* 创建工具 */];
   }
   ```

3. **权限感知工具集**:
   - 使用 `this.settings.agentId` 进行智能体特定操作
   - 永远不要在工具参数中暴露 `agentId`
   - 在服务层验证权限

### 知识库工具集架构

知识库工具集展示了安全权限处理：

1. **设置配置**: `agentId` 存储在工具集设置中
2. **服务层权限检查**: 使用高效的数据库查询
3. **错误处理**: 返回适当的禁止访问异常

```typescript
// 在 KnowledgeBaseService.query() 中
if (agentId) {
  const hasAccess = await this.prisma.agentKnowledgeBase.findUnique({
    where: { agentId_knowledgeBaseId: { agentId, knowledgeBaseId } }
  });
  if (!hasAccess) {
    throw new ForbiddenException('智能体无权限访问该知识库');
  }
}
```

## 📝 开发工作流

### 开始开发前

1. **环境设置**:

   ```bash
   pnpm install
   pnpm --filter agent-api db:generate
   pnpm --filter agent-api db:push
   ```

2. **启动开发**:

   ```bash
   docker compose up --build -d  # 完整容器化环境
   # 或
   pnpm dev  # 本地开发
   ```

### 代码变更工作流

1. **进行修改**: 编辑源文件
2. **类型检查**: `pnpm --filter agent-api typecheck`
3. **运行测试**: `pnpm --filter agent-api test`
4. **代码检查**: `pnpm --filter agent-api lint`
5. **手动测试**: 验证更改按预期工作

### 添加新功能

1. **数据库变更**:
   - 更新 `schema.prisma`
   - 运行 `pnpm --filter agent-api db:generate`
   - 运行 `pnpm --filter agent-api db:push`

2. **API 变更**:
   - 首先更新服务层
   - 添加控制器端点
   - 更新响应类型
   - 添加全面的测试

3. **前端集成**:
   - 更新 API 客户端
   - 添加新的 UI 组件
   - 测试端到端工作流

## 🛡️ 安全最佳实践

### 数据访问控制

- **永远不要在工具参数中暴露敏感ID**
- **使用数据库约束进行权限检查**
- **在服务边界验证所有输入**
- **记录访问尝试以供审计**

### 错误处理

- **通过 ResponseInterceptor 使用标准HTTP状态码**
- **在API响应中返回用户友好的消息**
- **服务端记录详细错误以供调试**
- **永远不要在错误消息中暴露内部系统详细信息**

### 测试安全性

- **测试未授权访问场景**
- **验证权限边界**
- **Mock外部服务以防止数据泄露**
- **使用类型安全的测试工具**

## 🔍 常见问题排查

### 测试中的类型错误

**问题**: `Property 'data' does not exist on type 'ErrorResponse | DataResponse<T>'`

**解决方案**: 在控制器测试中使用类型断言:

```typescript
expect((result as DataResponse<any>).data).toEqual(expectedData);
```

**说明**: 控制器测试验证 ResponseBuilder 包装，而服务测试检查原始数据。

### 权限拒绝错误

**问题**: `智能体无权限访问该知识库`

**解决方案**:

1. 验证数据库中存在 `AgentKnowledgeBase` 关系
2. 检查工具集设置中 `agentId` 正确设置
3. 确保唯一约束 `agentId_knowledgeBaseId` 正确配置

### 数据库连接问题

**问题**: 开发期间 Prisma 客户端错误

**解决方案**:

```bash
pnpm --filter agent-api db:generate
pnpm --filter agent-api db:push
# 或完全重置:
pnpm --filter agent-api db:reset
```

### LlamaIndex 配置

**问题**: `Cannot find Embedding, please set Settings.embedModel`

**解决方案**: 确保测试环境中有适当的 LlamaIndex 配置或添加适当的模拟。

## 📌 重要开发提醒

### 代码标准

- **只做被要求的事情；不多不少**
- **除非绝对必要，永远不要创建文件**
- **总是优先编辑现有文件而不是创建新文件**
- **除非明确要求，永远不要主动创建文档文件 (*.md) 或 README 文件**

### 测试标准

- **服务层**: 测试原始数据返回，不使用 ResponseBuilder 包装
- **控制器层**: 使用适当的类型断言测试 ResponseBuilder 包装的响应
- **提交更改前必须运行 typecheck 和测试**
- **在测试中适当地模拟外部依赖**

### 安全标准

- **永远不要在工具参数中暴露 agentId 或敏感ID**
- **使用数据库唯一约束进行高效权限检查**
- **在服务层而不是控制器层验证所有权限**
- **对访问违规总是抛出适当的异常**

### 架构原则

- **维护关注点分离**: 服务 → 控制器 → 拦截器
- **遵循既定模式**: 控制器使用 ResponseBuilder，服务返回原始数据
- **正确使用 TypeScript 类型**: 优先选择类型安全而不是 `any`
- **保持工具集设置内部化**: 永远不要向AI工具暴露内部配置
