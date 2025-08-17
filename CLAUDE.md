# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level Commands (Turborepo)

- `pnpm dev` - Start all applications in development mode
- `pnpm build` - Build all applications
- `pnpm lint` - Lint all applications
- `pnpm format` - Format code with Prettier

### Per-Application Commands

- `pnpm --filter agent-api <command>` - Run command in agent-api
- `pnpm --filter agent-web <command>` - Run command in agent-web

### Agent API (NestJS) Commands

- `pnpm --filter agent-api dev` - Start API in watch mode
- `pnpm --filter agent-api build` - Build the API
- `pnpm --filter agent-api test` - Run unit tests
- `pnpm --filter agent-api test:e2e` - Run end-to-end tests
- `pnpm --filter agent-api typecheck` - Type checking
- `pnpm --filter agent-api lint` - Lint with auto-fix

### Database Commands (from agent-api directory)

- `pnpm --filter agent-api db:generate` - Generate Prisma client
- `pnpm --filter agent-api db:migrate` - Run database migrations
- `pnpm --filter agent-api db:push` - Push schema changes
- `pnpm --filter agent-api db:studio` - Open Prisma Studio
- `pnpm --filter agent-api db:seed` - Seed database
- `pnpm --filter agent-api db:reset` - Reset and reseed database

### Agent Web (React + Vite) Commands

- `pnpm --filter agent-web dev` - Start web app in development
- `pnpm --filter agent-web build` - Build web application
- `pnpm --filter agent-web typecheck` - Type checking
- `pnpm --filter agent-web lint` - Lint with ESLint

### Docker Development

- `./scripts/dev.sh` - Start full development environment with Docker
- `./scripts/status.sh` - Check service status
- `./scripts/stop.sh` - Stop all services
- `docker compose logs -f <service>` - View service logs

## Architecture Overview

### Monorepo Structure

This is a Turborepo-based monorepo with the following structure:

- **apps/agent-api**: NestJS backend API with Prisma ORM
- **apps/agent-web**: React frontend with Vite
- **packages/**: Shared packages (UI components, configs)

### Agent API (Backend)

Built with NestJS framework following modular architecture:

**Core Modules:**

- **AgentModule** (`src/agent/`): Manages AI agents and their configurations
- **WorkflowModule** (`src/workflow/`): Handles workflow execution with DSL schema
- **ToolsModule** (`src/tool/`): Manages toolkits and individual tools
- **KnowledgeBaseModule** (`src/knowledge-base/`): Vector database integration for RAG
- **LlamaIndexModule** (`src/llamaindex/`): LlamaIndex integration for AI workflows
- **PrismaModule** (`src/prisma/`): Database layer with PostgreSQL + pgvector

**Key Features:**

- Agent-based architecture with configurable toolkits
- Workflow DSL for complex multi-agent orchestration
- Knowledge base management with vector storage
- Tool explorer and dynamic toolkit registration

### Database Schema

Uses PostgreSQL with pgvector extension:

- **Agent**: Core agent configuration with prompts and options
- **Toolkit/Tool**: Modular tool system with JSON schema validation
- **Workflow**: DSL-based workflow definitions with agent associations
- **KnowledgeBase**: Vector storage for RAG with file management
- **AgentToolkit/AgentTool/AgentKnowledgeBase**: Many-to-many relationship tables

### Agent Web (Frontend)

React application with:

- **React Query**: Server state management
- **React Router**: Client-side routing
- **Tailwind CSS**: Styling framework
- **Radix UI**: Component primitives

**Key Pages:**

- `Dashboard.tsx`: Main overview
- `Agents.tsx`: Agent management
- `Workflows.tsx`: Workflow builder/runner
- `KnowledgeBases.tsx`: Knowledge base management
- `Toolkits.tsx`: Tool management
- `AgentChat.tsx`: Chat interface

## Development Environment

### Prerequisites

- Node.js >= 20
- PNPM (package manager)
- Docker & Docker Compose

### Environment Setup

1. Use `./scripts/dev.sh` for containerized development (recommended)
2. Services run on:
   - Agent API: <http://localhost:3001>
   - Agent Web: <http://localhost:5173>
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Testing

- API tests: Located in `apps/agent-api/test/`
- Run `pnpm --filter agent-api test` for unit tests
- Run `pnpm --filter agent-api test:e2e` for end-to-end tests

### Code Quality

- ESLint configuration shared via `@workspace/eslint-config`
- TypeScript configuration shared via `@workspace/typescript-config`
- Prettier for code formatting
- Always run `typecheck` and `lint` before commits
