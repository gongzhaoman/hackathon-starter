# 🤖 智能体平台 - Agent Platform

一个功能强大的智能体管理平台，基于现代化的 Monorepo 架构构建。支持多智能体协作、工作流编排、知识库管理和工具集成的完整解决方案。

## 📁 项目结构

```
agent-platform/
├── apps/                          # 应用目录
│   ├── agent-api/                 # 智能体后端 API 服务 (NestJS)
│   │   ├── src/
│   │   │   ├── agent/             # 智能体管理模块
│   │   │   ├── workflow/          # 工作流引擎模块
│   │   │   ├── tool/              # 工具与工具集管理
│   │   │   ├── knowledge-base/    # 知识库管理模块
│   │   │   ├── llamaindex/        # LlamaIndex 集成
│   │   │   └── prisma/            # 数据库层
│   │   ├── prisma/                # 数据库模型与迁移
│   │   ├── Dockerfile             # Docker 配置
│   │   └── package.json
│   └── agent-web/                 # 智能体前端管理界面 (React)
│       ├── src/
│       │   ├── pages/             # 页面组件
│       │   ├── components/        # 共享组件
│       │   ├── services/          # API 服务层
│       │   └── types/             # TypeScript 类型定义
│       ├── Dockerfile             # Docker 配置
│       └── package.json
├── packages/                      # 共享包目录
│   ├── ui/                        # UI 组件库
│   ├── eslint-config/             # ESLint 配置
│   └── typescript-config/         # TypeScript 配置
├── scripts/                       # 管理脚本
│   ├── dev.sh                     # 开发环境启动
│   ├── prod.sh                    # 生产环境部署
│   ├── status.sh                  # 查看服务状态
│   └── stop.sh                    # 停止服务
├── docker-compose.yml             # 本地开发环境配置
├── docker-compose.prod.yml        # 生产环境配置
├── .env.example                   # 环境变量模板
├── turbo.json                     # Turborepo 配置
├── pnpm-workspace.yaml           # PNPM 工作空间配置
└── package.json                   # 根包配置
```

## 🛠 技术栈

### 后端服务 (agent-api)

- **框架**: NestJS (企业级 Node.js 框架)
- **数据库**: PostgreSQL + pgvector (向量数据库扩展)
- **ORM**: Prisma (类型安全的数据库访问)
- **AI 集成**: LlamaIndex (AI 工作流引擎)
- **缓存**: Redis (高性能缓存)

### 前端应用 (agent-web)

- **框架**: React 19 + Vite (现代前端构建)
- **状态管理**: React Query (服务端状态管理)
- **UI 组件**: Radix UI + Tailwind CSS
- **路由**: React Router (客户端路由)

### 开发工具

- **Monorepo**: Turborepo + PNPM Workspaces
- **代码质量**: ESLint + Prettier + TypeScript
- **容器化**: Docker + Docker Compose (支持热更新)

### 核心特性

- **智能体管理**: 创建、配置和管理多个 AI 智能体
- **工作流编排**: DSL 驱动的复杂工作流定义与执行
- **知识库集成**: 向量数据库支持的 RAG (检索增强生成)
- **工具系统**: 模块化工具集，支持动态扩展
- **多智能体协作**: 支持智能体间的协调与通信

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- Docker & Docker Compose
- PNPM >= 8

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd agent-platform
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 给脚本添加执行权限

```bash
chmod +x scripts/*.sh
```

### 4. 启动开发环境

```bash
# 使用docker-compose启动（推荐）
./scripts/dev.sh

# 或者使用 pnpm 启动（需要先起数据库）
pnpm dev
```

## 🌐 服务访问地址

启动成功后，您可以通过以下地址访问各个服务：

| 服务 | 本地地址 | 端口 | 描述 |
|------|----------|------|------|
| **智能体管理界面** | http://localhost:5173 | 5173 | React 前端管理平台 |
| **智能体 API** | http://localhost:3001 | 3001 | NestJS 后端服务 |
| **PostgreSQL** | localhost:5432 | 5432 | 主数据库 (含 pgvector) |
| **Redis** | localhost:6379 | 6379 | 缓存服务 |

## 📜 常用命令

### 开发环境管理

```bash
# 启动开发环境（支持热更新）
./scripts/dev.sh

# 查看服务状态
./scripts/status.sh

# 停止服务
./scripts/stop.sh

# 启动特定服务
docker compose up [service-name]

# 停止特定服务
docker compose stop [service-name]

# 查看日志
docker compose logs -f [service-name]

# 重建特定服务
docker compose up --build [service-name]
```

### Monorepo 开发

```bash
# 在根目录执行所有应用的命令
pnpm run dev          # 启动所有应用
pnpm run build        # 构建所有应用
pnpm run lint         # 检查所有应用

# 针对特定应用执行命令
pnpm --filter agent-api run dev
pnpm --filter agent-web run build
pnpm --filter agent-web run lint

# 添加依赖到特定应用
pnpm --filter agent-api add @llamaindex/core
pnpm --filter agent-web add @tanstack/react-query
```

### 数据库管理

```bash
# 进入 agent-api 容器
docker compose exec agent-api sh

# 在容器内执行 Prisma 命令
cd apps/agent-api
pnpm run db:generate     # 生成客户端
pnpm run db:migrate      # 运行迁移
pnpm run db:push         # 推送模式更改
pnpm run db:studio       # 打开 Prisma Studio
```

## 🏭 生产环境部署


### 1. 部署到生产环境

```bash
# 使用脚本部署
./scripts/prod.sh

# 或手动部署
docker compose -f docker-compose.prod.yml up --build -d
```

### 2. 生产环境管理

```bash
# 查看生产环境状态
docker compose -f docker-compose.prod.yml ps

# 查看生产环境日志
docker compose -f docker-compose.prod.yml logs -f

# 停止生产环境
docker compose -f docker-compose.prod.yml down

# 更新服务
docker compose -f docker-compose.prod.yml up --build -d [service-name]
```

## 🔥 热更新功能

### 文件同步 (sync)

- 源代码变更自动同步到容器
- 支持的路径：`src/`、`app/`、`packages/`

### 自动重建 (rebuild)

- `package.json` 变更触发容器重新构建
- 新增/删除依赖时自动重建

### 使用方法

```bash
./scripts/dev.sh
```

## 🌟 平台功能

### 智能体管理
- **智能体创建**: 支持自定义 prompt、配置参数和工具集成
- **智能体编排**: 可视化配置智能体之间的协作关系
- **智能体监控**: 实时监控智能体运行状态和性能指标

### 工作流引擎
- **DSL 定义**: 使用 JSON DSL 定义复杂的工作流逻辑
- **多智能体协作**: 支持智能体间的消息传递和状态同步
- **条件分支**: 支持基于条件的流程控制和决策节点
- **错误处理**: 内置错误恢复和重试机制

### 知识库系统
- **向量存储**: 基于 pgvector 的高性能向量数据库
- **文件管理**: 支持多种文档格式的上传和处理
- **RAG 集成**: 检索增强生成，提升智能体回答质量
- **知识检索**: 语义搜索和相似度匹配

### 工具生态
- **工具注册**: 动态注册和管理外部工具
- **工具集成**: 支持 REST API、数据库、文件系统等工具
- **工具链**: 构建复杂的工具调用链
- **权限控制**: 细粒度的工具访问权限管理

## 🏗️ 系统架构

### 后端架构 (agent-api)
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Agent Module  │  │ Workflow Module │  │Knowledge Module │
│                 │  │                 │  │                 │
│ • 智能体管理     │  │ • DSL 解析      │  │ • 向量存储       │
│ • 配置管理       │  │ • 流程执行      │  │ • 文件处理       │
│ • 状态监控       │  │ • 状态管理      │  │ • 语义检索       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │              Tools Module                       │
         │                                                 │
         │ • 工具注册与发现    • 工具链管理                 │
         │ • 动态加载         • 权限控制                   │
         │ • API 集成         • 执行监控                   │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │               Data Layer                        │
         │                                                 │
         │ • PostgreSQL + pgvector  • Redis Cache          │
         │ • Prisma ORM             • Session Storage      │
         └─────────────────────────────────────────────────┘
```

### 前端架构 (agent-web)
```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Pages Layer   │ Components Layer│     Services Layer      │
│                 │                 │                         │
│ • Dashboard     │ • Layout        │ • API Client            │
│ • Agents        │ • Forms         │ • React Query           │
│ • Workflows     │ • Tables        │ • State Management      │
│ • KnowledgeBase │ • Chat UI       │ • Error Handling        │
│ • Toolkits      │ • Charts        │ • WebSocket Connection  │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🛡️ 最佳实践

### 智能体设计

- **明确角色定义**: 为每个智能体定义清晰的职责和边界
- **提示词工程**: 编写高质量的 prompt，包含上下文和约束条件
- **工具集成**: 合理选择和配置工具，避免功能重叠
- **错误处理**: 设计智能体的异常处理和降级策略

### 工作流设计

- **模块化设计**: 将复杂流程拆分为可复用的子流程
- **状态管理**: 明确定义工作流各阶段的状态和转换条件
- **并发控制**: 合理设置并发执行的智能体数量
- **监控告警**: 设置关键节点的监控和告警机制

### 知识库管理

- **数据质量**: 确保知识库内容的准确性和时效性
- **向量优化**: 选择合适的 embedding 模型和相似度算法
- **权限分级**: 根据敏感程度设置不同的访问权限
- **定期维护**: 建立知识库的更新和清理机制

### 系统运维

- **资源监控**: 监控 CPU、内存、存储等系统资源使用情况
- **性能优化**: 定期分析慢查询和瓶颈点，进行性能调优
- **备份策略**: 建立完善的数据备份和恢复机制
- **安全防护**: 实施访问控制、数据加密和安全审计

## 🔧 故障排除

### 常见问题

#### 1. 端口冲突

```bash
# 查看端口占用
lsof -i :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"  # 将本地端口改为 3001
```

#### 2. 容器启动失败

```bash
# 查看详细日志
docker compose logs [service-name] --tail 50 -f

# 重建镜像
docker compose build --no-cache [service-name]

# 清理 Docker 缓存
docker system prune -a
```

#### 3. 数据库连接问题

```bash
# 检查数据库是否启动
docker compose ps postgres

# 测试数据库连接
docker compose exec postgres psql -U postgres -d hackathon
```

#### 4. 热更新不工作

```bash
docker-compose watch

# 检查文件权限
ls -la apps/your-app/src/
```

### 清理命令

```bash
# 停止并删除所有容器
docker compose down

# 删除所有相关数据
docker compose down -v

# 清理 Docker 系统
docker system prune -a
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

agent-api agent-web 暂不采用 MIT 许可证，后续将移植到单独的仓库，规划采用主流工作流框架相同的许可方式。

## 🙋‍♂️ 支持

如果您在使用过程中遇到问题：

1. 查看本文档的故障排除部分
2. 搜索已有的 Issues
3. 创建新的 Issue 描述问题
4. 联系项目维护者

---

**构建下一代智能体平台，让 AI 协作更简单！** 🤖✨