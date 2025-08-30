# 🤖 智能体平台 - Agent Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Latest-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)

一个开源的、生产就绪的智能体管理平台，基于现代化的 Monorepo 架构构建。支持AI智能体创建、工作流编排、知识库集成和可扩展工具集。

[English](README.md) | 中文

## ✨ 核心特性

- 🤖 **多智能体管理** - 创建、配置和编排多个AI智能体
- 🔄 **工作流自动化** - DSL驱动的复杂工作流执行
- 📚 **知识库集成** - 基于向量数据库的RAG检索增强生成
- 🛠️ **可扩展工具系统** - 模块化工具，支持动态注册
- 🔒 **细粒度权限控制** - 智能体级别的工具和知识库访问控制
- 🚀 **生产就绪** - Docker部署，支持监控和扩容
- 💻 **现代化UI** - 直观的React管理界面
- 🔧 **开发者友好** - 完整的TypeScript支持和API文档

## 📁 项目结构

```text
hackathon-starter/
├── apps/                          # 应用目录
│   ├── agent-api/                 # NestJS 后端API
│   │   ├── src/
│   │   │   ├── agent/             # 智能体管理
│   │   │   ├── workflow/          # 工作流引擎
│   │   │   ├── tool/              # 工具和工具集
│   │   │   ├── knowledge-base/    # 知识库管理
│   │   │   ├── llamaindex/        # LlamaIndex集成
│   │   │   └── prisma/            # 数据库层
│   │   └── prisma/                # 数据库模型和迁移
│   └── agent-web/                 # React 前端
│       ├── src/
│       │   ├── pages/             # UI页面
│       │   ├── components/        # 共享组件
│       │   ├── services/          # API客户端
│       │   └── types/             # TypeScript类型定义
├── packages/                      # 共享包
│   ├── ui/                        # UI组件库
│   ├── eslint-config/             # ESLint配置
│   └── typescript-config/         # TypeScript配置
├── docker-compose.yml             # 开发环境配置
├── docker-compose.prod.yml        # 生产环境配置
├── .env.example                   # 环境变量模板
├── turbo.json                     # Turborepo配置
├── pnpm-workspace.yaml           # PNPM工作空间配置
└── package.json                   # 根包配置
```

## 🛠 技术栈

### 后端 (agent-api)

- **框架**: [NestJS](https://nestjs.com/) - 企业级Node.js框架
- **数据库**: [PostgreSQL](https://postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) - 向量数据库扩展
- **ORM**: [Prisma](https://prisma.io/) - 类型安全的数据库访问
- **AI集成**: [LlamaIndex](https://www.llamaindex.ai/) - AI工作流引擎
- **缓存**: [Redis](https://redis.io/) - 高性能缓存

### 前端 (agent-web)

- **框架**: [React 19](https://reactjs.org/) + [Vite](https://vitejs.dev/) - 现代化构建工具
- **状态管理**: [React Query](https://tanstack.com/query) - 服务端状态管理
- **UI库**: [Radix UI](https://radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **路由**: [React Router](https://reactrouter.com/) - 客户端路由

### 开发和运维

- **Monorepo**: [Turborepo](https://turbo.build/) + [PNPM Workspaces](https://pnpm.io/workspaces)
- **代码质量**: ESLint + Prettier + TypeScript
- **容器化**: Docker + Docker Compose，支持热重载
- **数据库**: PostgreSQL配合pgvector扩展进行向量操作

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://docker.com/) 和 Docker Compose
- [PNPM](https://pnpm.io/) >= 8

### 安装步骤

1. **克隆仓库**

   ```bash
   git clone https://github.com/your-username/hackathon-starter.git
   cd hackathon-starter
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **设置环境**

   ```bash
   # 复制环境变量模板
   cp .env.example .env
   ```

4. **启动开发环境**

   ```bash
   # 使用Docker（推荐）
   docker compose up --build -d

   # 或本地启动（需要先设置数据库）
   pnpm dev
   ```

5. **访问平台**
   - 前端界面: <http://localhost:5173>
   - API服务: <http://localhost:3001>
   - API文档: <http://localhost:3001/api>

## 💻 开发命令

### 环境管理

```bash
# 启动开发环境（支持热重载）
docker compose up --build -d

# 查看服务状态
docker compose ps

# 停止所有服务
docker compose down

# 启动特定服务
docker compose up [service-name]

# 查看服务日志
docker compose logs -f [service-name]

# 重建特定服务
docker compose up --build [service-name]
```

### Monorepo开发

```bash
# 根目录命令（所有应用）
pnpm dev              # 启动所有应用
pnpm build            # 构建所有应用
pnpm lint             # 检查所有应用
pnpm format           # 格式化代码

# 应用特定命令
pnpm --filter agent-api dev      # 启动API监听模式
pnpm --filter agent-api test     # 运行单元测试
pnpm --filter agent-api typecheck # 类型检查
pnpm --filter agent-web dev      # 启动Web应用
pnpm --filter agent-web build    # 构建Web应用

# 添加依赖
pnpm --filter agent-api add @llamaindex/core
pnpm --filter agent-web add @tanstack/react-query
```

### 数据库管理

```bash
# 数据库操作（从根目录）
pnpm --filter agent-api db:generate    # 生成Prisma客户端
pnpm --filter agent-api db:migrate     # 运行迁移
pnpm --filter agent-api db:push        # 推送模式变更
pnpm --filter agent-api db:studio      # 打开Prisma Studio
pnpm --filter agent-api db:seed        # 初始化数据
pnpm --filter agent-api db:reset       # 重置数据库

# 直接连接数据库
docker compose exec postgres psql -U postgres -d hackathon
```

## 🚀 生产环境部署

### 部署到生产环境

```bash
# 生产环境部署
docker compose -f docker-compose.prod.yml up --build -d
```

### 生产环境管理

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

## 🔥 热重载开发

开发环境支持自动热重载：

- **文件同步**: 源代码变更自动同步到容器
- **自动重建**: `package.json`变更触发容器重建
- **支持路径**: `src/`, `app/`, `packages/`

```bash
# 启用热重载
docker compose up --build -d
```

## 📊 API文档

### 核心模块

#### 智能体管理

- `GET /agents` - 获取所有智能体
- `POST /agents` - 创建新智能体
- `PUT /agents/:id` - 更新智能体配置
- `DELETE /agents/:id` - 删除智能体

#### 工作流引擎

- `GET /workflows` - 获取工作流列表
- `POST /workflows` - 使用DSL创建工作流
- `POST /workflows/:id/execute` - 执行工作流
- `GET /workflows/:id/status` - 获取执行状态

#### 知识库

- `GET /knowledge-bases` - 获取知识库列表
- `POST /knowledge-bases` - 创建知识库
- `POST /knowledge-bases/:id/files` - 上传文件
- `POST /knowledge-bases/:id/query` - 查询知识库

#### 工具集

- `GET /toolkits` - 获取可用工具集
- `POST /toolkits/register` - 注册新工具集
- `GET /tools` - 获取单个工具列表

### 身份验证

API使用基于会话的身份验证。在请求中包含会话cookie或使用API密钥进行程序化访问。

### 响应格式

所有API响应遵循一致的格式：

```typescript
interface DataResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}
```

## 🏗️ 系统架构

### 系统架构图

```text
┌─────────────────────────────────────────────────────────────┐
│                    React 前端 (agent-web)                    │
│   仪表板 • 智能体 • 工作流 • 知识库 • 工具集   │
├─────────────────────────────────────────────────────────────┤
│                     NestJS API (agent-api)                      │
├────────────────┬────────────────┬───────────────────────────────┤
│  智能体模块   │ 工作流模块 │   知识库模块    │
│                │                 │                           │
│ • 管理    │ • DSL解析   │ • 向量存储         │
│ • 配置 │ • 执行     │ • 文件处理        │
│ • 监控    │ • 状态管理   │ • 语义搜索        │
├────────────────┴────────────────┴───────────────────────────────┤
│                         工具模块                           │
│        工具注册 • 动态加载 • 权限控制       │
├─────────────────────────────────────────────────────────────┤
│                       数据层                              │
│     PostgreSQL + pgvector • Redis缓存 • Prisma ORM             │
└─────────────────────────────────────────────────────────────┘
```

### 核心设计原则

- **模块化架构**: 每个模块具有清晰的职责和边界
- **类型安全**: 完整的TypeScript覆盖，使用Prisma生成的类型
- **权限系统**: 对智能体、工具和知识库进行细粒度访问控制
- **可扩展性**: 基于插件的工具集系统，便于集成
- **性能优化**: 通过缓存、连接池和向量索引进行优化

## 🔧 故障排除

### 常见问题

#### 端口冲突

```bash
# 查看端口占用
lsof -i :3000

# 修改docker-compose.yml中的端口映射
ports:
  - "3001:3000"  # 将本地端口改为3001
```

#### 容器启动失败

```bash
# 查看详细日志
docker compose logs [service-name] --tail 50 -f

# 重建镜像
docker compose build --no-cache [service-name]

# 清理Docker缓存
docker system prune -a
```

#### 数据库连接问题

```bash
# 检查数据库状态
docker compose ps postgres

# 测试数据库连接
docker compose exec postgres psql -U postgres -d hackathon
```

#### 热重载不工作

```bash
# 启用文件监听
docker-compose watch

# 检查文件权限
ls -la apps/your-app/src/
```

### 清理命令

```bash
# 停止并删除所有容器
docker compose down

# 删除所有数据卷
docker compose down -v

# 清理Docker系统
docker system prune -a
```

## 🤝 贡献指南

我们欢迎贡献！请遵循以下步骤：

### 开发工作流

1. **Fork仓库**
2. **创建功能分支**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **进行更改**
   - 遵循现有的代码风格和约定
   - 为新功能添加测试
   - 如需要请更新文档
4. **测试更改**

   ```bash
   pnpm --filter agent-api test
   pnpm --filter agent-api typecheck
   pnpm --filter agent-api lint
   ```

5. **提交更改**

   ```bash
   git commit -m 'feat: 添加精彩功能'
   ```

6. **推送到你的Fork**

   ```bash
   git push origin feature/amazing-feature
   ```

7. **开启Pull Request**

### 代码规范指南

- 遵循现有的TypeScript和React模式
- 使用有意义的变量和函数名
- 为公共API添加JSDoc注释
- 保持函数小而专注
- 编写全面的测试

### 提交约定

我们使用[约定式提交](https://conventionalcommits.org/)：

- `feat:` - 新功能
- `fix:` - 错误修复
- `docs:` - 文档变更
- `style:` - 代码样式变更
- `refactor:` - 代码重构
- `test:` - 测试更新
- `chore:` - 构建过程或辅助工具变更

## 📄 许可证

本项目采用MIT许可证 - 查看[LICENSE](LICENSE)文件了解详情。

### 开源协议

这是一个MIT许可证下的开源项目。您可以自由地：

- 将软件用于任何目的
- 修改和分发软件
- 包含在专有软件中
- 销售软件副本

唯一的要求是包含原始版权声明和许可证文本。

## 📞 支持与社区

### 获取帮助

如果遇到问题：

1. 查看[故障排除部分](#-故障排除)
2. 搜索[现有问题](https://github.com/your-username/hackathon-starter/issues)
3. 创建[新问题](https://github.com/your-username/hackathon-starter/issues/new)，包含：
   - 问题的清晰描述
   - 重现步骤
   - 环境详细信息
   - 如适用，错误日志

### 资源

- 📚 [文档](https://github.com/your-username/hackathon-starter/wiki)
- 📊 [API参考](http://localhost:3001/api)（本地运行时）
- 🐛 [问题追踪器](https://github.com/your-username/hackathon-starter/issues)
- 💬 [讨论区](https://github.com/your-username/hackathon-starter/discussions)

---

**构建下一代AI智能体平台 —— 让AI协作更简单、更强大！** 🤖✨

## ⭐ Star历史

如果这个项目对您有帮助，请考虑给它一个star！🌟

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/hackathon-starter&type=Date)](https://star-history.com/#your-username/hackathon-starter&Date)
