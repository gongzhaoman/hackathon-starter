# 🚀 Hackathon Starter - Monorepo Template

一个功能完整的黑客马拉松项目模板，基于现代化的 Monorepo 架构，支持多种技术栈，开箱即用的 Docker 容器化方案。

## 📁 项目结构

```
hackathon-starter/
├── apps/                          # 应用目录
│   ├── agent-api/                 # NestJS API 服务
│   │   ├── src/                   # 源代码
│   │   ├── prisma/                # 数据库模型
│   │   ├── Dockerfile             # Docker 配置
│   │   └── package.json
│   ├── hono/                      # Hono API 服务
│   │   ├── src/                   # 源代码
│   │   ├── Dockerfile             # Docker 配置
│   │   └── package.json
│   ├── next/                      # Next.js 前端应用
│   │   ├── src/                   # 源代码
│   │   ├── Dockerfile             # Docker 配置
│   │   └── package.json
│   └── vite/                      # Vite + React 前端应用
│       ├── src/                   # 源代码
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

### 后端服务

- **API Agent**: NestJS + Prisma + PostgreSQL + Redis
- **Hono API**: Hono.js (轻量级 Web 框架)

### 前端应用

- **Next.js App**: React 19 + Next.js 15 + Tailwind CSS
- **Vite App**: React 19 + Vite + Tailwind CSS

### 开发工具

- **Monorepo**: Turborepo + PNPM Workspaces
- **代码质量**: ESLint + Prettier + TypeScript
- **容器化**: Docker + Docker Compose (支持热更新)

### 数据库

- **PostgreSQL**: 主数据库
- **Redis**: 缓存服务

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- Docker & Docker Compose
- PNPM >= 8

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd hackathon-starter
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
| **Next.js App** | http://localhost:3000 | 3000 | React 前端应用 |
| **Vite App** | http://localhost:5173 | 5173 | Vite React 应用 |
| **API Agent** | http://localhost:3001 | 3001 | NestJS API 服务 |
| **Hono API** | http://localhost:3002 | 3002 | Hono API 服务 |
| **PostgreSQL** | localhost:5432 | 5432 | 数据库服务 |
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
pnpm --filter next run build
pnpm --filter vite run lint

# 添加依赖到特定应用
pnpm --filter agent-api add express
pnpm --filter next add axios
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

## 📦 添加新的应用

### 1. 创建新应用

```bash
# 在 apps 目录下创建新应用
mkdir apps/new-app
cd apps/new-app

# 初始化 package.json
pnpm init
```

### 2. 配置 package.json

```json
{
  "name": "new-app",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "your-dev-command",
    "build": "your-build-command",
    "start": "your-start-command"
  }
}
```

### 3. 创建 Dockerfile

参考现有应用的 Dockerfile 模板，创建适合的多阶段构建配置。

### 4. 更新 docker-compose.yml

在 `docker-compose.yml` 和 `docker-compose.prod.yml` 中添加新服务配置。

## 🛡️ 最佳实践

### 代码质量

- 使用 ESLint 和 Prettier 保持代码一致性
- 配置 Git hooks 进行代码检查
- 遵循 TypeScript 严格模式

### 安全性

- 使用强密码和环境变量
- 定期更新依赖包
- 在生产环境中限制端口访问

### 性能优化

- 使用多阶段 Docker 构建
- 合理配置缓存策略
- 监控服务性能指标

### 开发效率

- 利用 Monorepo 共享代码
- 使用热更新加速开发
- 编写清晰的文档和注释

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

**祝您在黑客马拉松中取得好成绩！** 🏆