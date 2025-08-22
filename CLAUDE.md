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
- Unified API response format with ResponseBuilder
- Global response interceptor for HTTP standardization
- Permission-based access control for knowledge bases

**API Response Architecture:**

The API uses a layered response architecture:

1. **Service Layer**: Returns raw data objects
2. **Controller Layer**: Wraps data using `ResponseBuilder` utilities
3. **Response Interceptor**: Handles HTTP status codes and final formatting

All API responses follow the standard format:
```typescript
interface DataResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}
```

### Database Schema

Uses PostgreSQL with pgvector extension:

- **Agent**: Core agent configuration with prompts and options
- **Toolkit/Tool**: Modular tool system with JSON schema validation
- **Workflow**: DSL-based workflow definitions with agent associations
- **KnowledgeBase**: Vector storage for RAG with file management
- **AgentToolkit/AgentTool/AgentKnowledgeBase**: Many-to-many relationship tables

**Permission Architecture:**

The system implements fine-grained access control:

1. **Agent-Toolkit Relationships**: Configured via `AgentToolkit` with settings
2. **Agent-Knowledge Base Access**: Managed through `AgentKnowledgeBase` with unique constraints
3. **Tool Permissions**: Tools inherit agent permissions through toolkit associations

**Knowledge Base Access Control:**
```typescript
// Permission check uses database unique constraint for efficiency
const hasAccess = await prisma.agentKnowledgeBase.findUnique({
  where: {
    agentId_knowledgeBaseId: { agentId, knowledgeBaseId }
  }
});
```

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

### Testing Strategy

**Test Organization:**
- **Service tests** (`*.service.spec.ts`): Test business logic and data operations
- **Controller tests** (`*.controller.spec.ts`): Test HTTP layer and response formatting
- **Integration tests** (`apps/agent-api/test/`): Test complete request/response cycles
- **End-to-end tests**: Test full user workflows

**Running Tests:**
- `pnpm --filter agent-api test` - Run all unit tests
- `pnpm --filter agent-api test:e2e` - Run end-to-end tests
- `pnpm --filter agent-api test <file>` - Run specific test file
- `pnpm --filter agent-api test:cov` - Run tests with coverage

**Testing Best Practices:**

1. **Service Layer Tests**:
   ```typescript
   // Test raw data returns
   expect(result).toEqual(expectedData);
   ```

2. **Controller Layer Tests**:
   ```typescript
   // Test ResponseBuilder wrapped responses
   expect((result as DataResponse<any>).data).toEqual(expectedData);
   expect(result.success).toBe(true);
   ```

3. **Mock Setup**:
   - Mock external dependencies (Prisma, HTTP clients)
   - Use type-safe mocks with Jest
   - Reset mocks between tests

4. **Permission Testing**:
   - Test authorized and unauthorized access scenarios
   - Verify error responses match expected format

### Code Quality

- ESLint configuration shared via `@workspace/eslint-config`
- TypeScript configuration shared via `@workspace/typescript-config`
- Prettier for code formatting
- Always run `typecheck` and `lint` before commits

## Toolkit Development Guide

### Creating New Toolkits

1. **Extend BaseToolkit**:
   ```typescript
   @toolkitId('my-toolkit-01')
   export class MyToolkit extends BaseToolkit {
     name = 'My Custom Toolkit';
     description = 'Description of toolkit functionality';
     settings = { /* toolkit-specific settings */ };
     tools: ToolsType[] = [];
   }
   ```

2. **Implement Required Methods**:
   ```typescript
   validateSettings(): void {
     // Validate toolkit settings
   }

   protected async initTools(): Promise<void> {
     // Initialize tools asynchronously
     const FunctionTool = await this.llamaindexService.getFunctionTool();
     this.tools = [/* create tools */];
   }
   ```

3. **Permission-Aware Toolkits**:
   - Use `this.settings.agentId` for agent-specific operations
   - Never expose `agentId` in tool parameters
   - Validate permissions at the service layer

### Knowledge Base Toolkit Architecture

The knowledge base toolkit demonstrates secure permission handling:

1. **Settings Configuration**: `agentId` stored in toolkit settings
2. **Service-Level Permission Check**: Uses efficient database query
3. **Error Handling**: Returns appropriate forbidden exceptions

```typescript
// In KnowledgeBaseService.query()
if (agentId) {
  const hasAccess = await this.prisma.agentKnowledgeBase.findUnique({
    where: { agentId_knowledgeBaseId: { agentId, knowledgeBaseId } }
  });
  if (!hasAccess) {
    throw new ForbiddenException('智能体无权限访问该知识库');
  }
}
```

## Development Workflow

### Before Starting Development

1. **Environment Setup**:
   ```bash
   pnpm install
   pnpm --filter agent-api db:generate
   pnpm --filter agent-api db:push
   ```

2. **Start Development**:
   ```bash
   ./scripts/dev.sh  # Full containerized environment
   # OR
   pnpm dev  # Local development
   ```

### Code Changes Workflow

1. **Make Changes**: Edit source files
2. **Type Check**: `pnpm --filter agent-api typecheck`
3. **Run Tests**: `pnpm --filter agent-api test`
4. **Lint Code**: `pnpm --filter agent-api lint`
5. **Test Manually**: Verify changes work as expected

### Adding New Features

1. **Database Changes**:
   - Update `schema.prisma`
   - Run `pnpm --filter agent-api db:generate`
   - Run `pnpm --filter agent-api db:push`

2. **API Changes**:
   - Update service layer first
   - Add controller endpoints
   - Update response types
   - Add comprehensive tests

3. **Frontend Integration**:
   - Update API client
   - Add new UI components
   - Test end-to-end workflows

## Security Best Practices

### Data Access Control

- **Never expose sensitive IDs** in tool parameters
- **Use database constraints** for permission checks
- **Validate all inputs** at service boundaries
- **Log access attempts** for audit trails

### Error Handling

- **Use standard HTTP status codes** via ResponseInterceptor
- **Return user-friendly messages** in API responses
- **Log detailed errors** server-side for debugging
- **Never expose internal system details** in error messages

### Testing Security

- **Test unauthorized access scenarios**
- **Verify permission boundaries**
- **Mock external services** to prevent data leakage
- **Use type-safe test utilities**

## Troubleshooting Common Issues

### Type Errors in Tests

**Problem**: `Property 'data' does not exist on type 'ErrorResponse | DataResponse<T>'`

**Solution**: Use type assertions in controller tests:
```typescript
expect((result as DataResponse<any>).data).toEqual(expectedData);
```

**Explanation**: Controller tests verify ResponseBuilder wrapping, while service tests check raw data.

### Permission Denied Errors

**Problem**: `智能体无权限访问该知识库`

**Solution**: 
1. Verify `AgentKnowledgeBase` relationship exists in database
2. Check `agentId` is correctly set in toolkit settings
3. Ensure unique constraint `agentId_knowledgeBaseId` is properly configured

### Database Connection Issues

**Problem**: Prisma client errors during development

**Solution**:
```bash
pnpm --filter agent-api db:generate
pnpm --filter agent-api db:push
# or for complete reset:
pnpm --filter agent-api db:reset
```

### LlamaIndex Configuration

**Problem**: `Cannot find Embedding, please set Settings.embedModel`

**Solution**: Ensure proper LlamaIndex configuration in test environment or add proper mocking.

# Important Development Reminders

## Code Standards
- **Do what has been asked; nothing more, nothing less**
- **NEVER create files unless absolutely necessary for achieving your goal**
- **ALWAYS prefer editing an existing file to creating a new one**
- **NEVER proactively create documentation files (*.md) or README files unless explicitly requested**

## Testing Standards
- **Service Layer**: Test raw data returns without ResponseBuilder wrapping
- **Controller Layer**: Test ResponseBuilder wrapped responses with proper type assertions
- **Always run typecheck and tests before committing changes**
- **Mock external dependencies appropriately in tests**

## Security Standards
- **Never expose agentId or sensitive IDs in tool parameters**
- **Use database unique constraints for efficient permission checks**
- **Validate all permissions at service layer, not controller layer**
- **Always throw appropriate exceptions for access violations**

## Architecture Principles
- **Maintain separation of concerns**: Service → Controller → Interceptor
- **Follow established patterns**: ResponseBuilder for controllers, raw data for services
- **Use TypeScript types correctly**: Prefer type safety over `any`
- **Keep toolkit settings internal**: Never expose internal configuration to AI tools
