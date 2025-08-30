# 🤖 Agent Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Latest-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)

An open-source, production-ready agent management platform built with modern monorepo architecture. Create, orchestrate, and manage AI agents with workflow automation, knowledge base integration, and extensible toolkits.

English | [中文](README_CN.md)

## ✨ Features

- 🤖 **Multi-Agent Management** - Create, configure, and orchestrate multiple AI agents
- 🔄 **Workflow Automation** - DSL-driven complex workflow execution
- 📚 **Knowledge Base Integration** - Vector database with RAG capabilities
- 🛠️ **Extensible Toolkit System** - Modular tools with dynamic registration
- 🔒 **Fine-grained Permissions** - Agent-level access control for tools and knowledge
- 🚀 **Production Ready** - Docker deployment with monitoring and scaling
- 💻 **Modern UI** - Intuitive React interface for platform management
- 🔧 **Developer Friendly** - Full TypeScript support with comprehensive APIs

## 📁 Project Structure

```text
hackathon-starter/
├── apps/                          # Applications
│   ├── agent-api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── agent/             # Agent management
│   │   │   ├── workflow/          # Workflow engine
│   │   │   ├── tool/              # Tools & toolkits
│   │   │   ├── knowledge-base/    # Knowledge management
│   │   │   ├── llamaindex/        # LlamaIndex integration
│   │   │   └── prisma/            # Database layer
│   │   └── prisma/                # Database schema & migrations
│   └── agent-web/                 # React Frontend
│       ├── src/
│       │   ├── pages/             # UI pages
│       │   ├── components/        # Shared components
│       │   ├── services/          # API client
│       │   └── types/             # TypeScript definitions
├── packages/                      # Shared packages
│   ├── ui/                        # UI component library
│   ├── eslint-config/             # ESLint configuration
│   └── typescript-config/         # TypeScript configuration
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml        # Production configuration
├── .env.example                   # Environment template
├── turbo.json                     # Turborepo configuration
├── pnpm-workspace.yaml           # PNPM workspace setup
└── package.json                   # Root package configuration
```

## 🛠 Tech Stack

### Backend (agent-api)

- **Framework**: [NestJS](https://nestjs.com/) - Enterprise-grade Node.js framework
- **Database**: [PostgreSQL](https://postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) - Vector database extension
- **ORM**: [Prisma](https://prisma.io/) - Type-safe database access
- **AI Integration**: [LlamaIndex](https://www.llamaindex.ai/) - AI workflow engine
- **Cache**: [Redis](https://redis.io/) - High-performance caching

### Frontend (agent-web)

- **Framework**: [React 19](https://reactjs.org/) + [Vite](https://vitejs.dev/) - Modern build tooling
- **State Management**: [React Query](https://tanstack.com/query) - Server state management
- **UI Library**: [Radix UI](https://radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Routing**: [React Router](https://reactrouter.com/) - Client-side routing

### Development & DevOps

- **Monorepo**: [Turborepo](https://turbo.build/) + [PNPM Workspaces](https://pnpm.io/workspaces)
- **Code Quality**: ESLint + Prettier + TypeScript
- **Containerization**: Docker + Docker Compose with hot reload
- **Database**: PostgreSQL with pgvector extension for vector operations

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://docker.com/) & Docker Compose
- [PNPM](https://pnpm.io/) >= 8

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/hackathon-starter.git
   cd hackathon-starter
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment**

   ```bash
   # Copy environment template
   cp .env.example .env
   ```

4. **Start development environment**

   ```bash
   # Using Docker (recommended)
   docker compose up --build -d

   # Or locally (requires database setup)
   pnpm dev
   ```

5. **Access the platform**
   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3001>
   - API Docs: <http://localhost:3001/api>

## 💻 Development Commands

### Environment Management

```bash
# Start development environment (with hot reload)
docker compose up --build -d

# Check service status
docker compose ps

# Stop all services
docker compose down

# Start specific service
docker compose up [service-name]

# View service logs
docker compose logs -f [service-name]

# Rebuild specific service
docker compose up --build [service-name]
```

### Monorepo Development

```bash
# Root level commands (all apps)
pnpm dev              # Start all applications
pnpm build            # Build all applications
pnpm lint             # Lint all applications
pnpm format           # Format code with Prettier

# Application-specific commands
pnpm --filter agent-api dev      # Start API in watch mode
pnpm --filter agent-api test     # Run unit tests
pnpm --filter agent-api typecheck # Type checking
pnpm --filter agent-web dev      # Start web app
pnpm --filter agent-web build    # Build web application

# Add dependencies
pnpm --filter agent-api add @llamaindex/core
pnpm --filter agent-web add @tanstack/react-query
```

### Database Management

```bash
# Database operations (from root)
pnpm --filter agent-api db:generate    # Generate Prisma client
pnpm --filter agent-api db:migrate     # Run migrations
pnpm --filter agent-api db:push        # Push schema changes
pnpm --filter agent-api db:studio      # Open Prisma Studio
pnpm --filter agent-api db:seed        # Seed database
pnpm --filter agent-api db:reset       # Reset database

# Connect to database directly
docker compose exec postgres psql -U postgres -d hackathon
```

## 🚀 Production Deployment

### Deploy to Production

```bash
# Production deployment
docker compose -f docker-compose.prod.yml up --build -d
```

### Production Management

```bash
# Check production status
docker compose -f docker-compose.prod.yml ps

# View production logs
docker compose -f docker-compose.prod.yml logs -f

# Stop production environment
docker compose -f docker-compose.prod.yml down

# Update services
docker compose -f docker-compose.prod.yml up --build -d [service-name]
```

## 🔥 Hot Reload Development

The development environment supports automatic hot reloading:

- **File Sync**: Source code changes automatically sync to containers
- **Auto Rebuild**: `package.json` changes trigger container rebuilds
- **Supported Paths**: `src/`, `app/`, `packages/`

```bash
# Start with hot reload enabled
docker compose up --build -d
```

## 📊 API Documentation

### Core Modules

#### Agent Management

- `GET /agents` - List all agents
- `POST /agents` - Create new agent
- `PUT /agents/:id` - Update agent configuration
- `DELETE /agents/:id` - Delete agent

#### Workflow Engine

- `GET /workflows` - List workflows
- `POST /workflows` - Create workflow with DSL
- `POST /workflows/:id/execute` - Execute workflow
- `GET /workflows/:id/status` - Get execution status

#### Knowledge Base

- `GET /knowledge-bases` - List knowledge bases
- `POST /knowledge-bases` - Create knowledge base
- `POST /knowledge-bases/:id/files` - Upload files
- `POST /knowledge-bases/:id/query` - Query knowledge base

#### Toolkits

- `GET /toolkits` - List available toolkits
- `POST /toolkits/register` - Register new toolkit
- `GET /tools` - List individual tools

### Authentication

The API uses session-based authentication. Include session cookies in requests or use API keys for programmatic access.

### Response Format

All API responses follow a consistent format:

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

### 后端架构 (agent-api)

```mermaid
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

```mermaid
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

## 🔧 Architecture Overview

### System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (agent-web)                    │
│   Dashboard • Agents • Workflows • Knowledge Base • Toolkits   │
├─────────────────────────────────────────────────────────────┤
│                     NestJS API (agent-api)                      │
├────────────────┬────────────────┬───────────────────────────────┤
│  Agent Module   │ Workflow Module │   Knowledge Base Module    │
│                │                 │                           │
│ • Management    │ • DSL Parsing   │ • Vector Storage         │
│ • Configuration │ • Execution     │ • File Processing        │
│ • Monitoring    │ • State Mgmt   │ • Semantic Search        │
├────────────────┴────────────────┴───────────────────────────────┤
│                         Tools Module                           │
│        Tool Registration • Dynamic Loading • Permission Control       │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                              │
│     PostgreSQL + pgvector • Redis Cache • Prisma ORM             │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

- **Modular Architecture**: Each module has clear responsibilities and boundaries
- **Type Safety**: Full TypeScript coverage with Prisma-generated types
- **Permission System**: Fine-grained access control for agents, tools, and knowledge bases
- **Extensibility**: Plugin-based toolkit system for easy integration
- **Performance**: Optimized with caching, connection pooling, and vector indexing

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check port usage
lsof -i :3000

# Modify port mapping in docker-compose.yml
ports:
  - "3001:3000"  # Change local port to 3001
```

#### Container Startup Failures

```bash
# View detailed logs
docker compose logs [service-name] --tail 50 -f

# Rebuild images
docker compose build --no-cache [service-name]

# Clean Docker cache
docker system prune -a
```

#### Database Connection Issues

```bash
# Check database status
docker compose ps postgres

# Test database connection
docker compose exec postgres psql -U postgres -d hackathon
```

#### Hot Reload Not Working

```bash
# Enable file watching
docker-compose watch

# Check file permissions
ls -la apps/your-app/src/
```

### Cleanup Commands

```bash
# Stop and remove all containers
docker compose down

# Remove all data volumes
docker compose down -v

# Clean Docker system
docker system prune -a
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation if needed
4. **Test your changes**

   ```bash
   pnpm --filter agent-api test
   pnpm --filter agent-api typecheck
   pnpm --filter agent-api lint
   ```

5. **Commit your changes**

   ```bash
   git commit -m 'feat: add amazing feature'
   ```

6. **Push to your fork**

   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**

### Code Style Guidelines

- Follow existing TypeScript and React patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write comprehensive tests

### Commit Convention

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build process or auxiliary tool changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Open Source

This is an open-source project under the MIT license. You are free to:

- Use the software for any purpose
- Modify and distribute the software
- Include in proprietary software
- Sell copies of the software

The only requirement is to include the original copyright notice and license text.

## 📞 Support & Community

### Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Search [existing issues](https://github.com/your-username/hackathon-starter/issues)
3. Create a [new issue](https://github.com/your-username/hackathon-starter/issues/new) with:
   - Clear description of the problem
   - Steps to reproduce
   - Environment details
   - Error logs if applicable

### Resources

- 📚 [Documentation](https://github.com/your-username/hackathon-starter/wiki)
- 📊 [API Reference](http://localhost:3001/api) (when running locally)
- 🐛 [Issue Tracker](https://github.com/your-username/hackathon-starter/issues)
- 💬 [Discussions](https://github.com/your-username/hackathon-starter/discussions)

---

**Building the next generation of AI agent platforms – making AI collaboration simple and powerful!** 🤖✨

## ⭐ Star History

If this project helped you, please consider giving it a star! 🌟

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/hackathon-starter&type=Date)](https://star-history.com/#your-username/hackathon-starter&Date)
