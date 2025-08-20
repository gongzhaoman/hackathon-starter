# Testing Guide

This document provides guidance on running and writing tests for the Agent API.

## Test Structure

The testing framework is built with Jest and follows these patterns:

- **Unit Tests**: Test individual services and controllers in isolation
- **Integration Tests**: Test module interactions with mocked dependencies  
- **End-to-End Tests**: Test complete API workflows with real HTTP requests

## Running Tests

### Basic Commands

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:cov

# Run coverage in watch mode
pnpm test:cov:watch

# Run only unit tests (exclude e2e)
pnpm test:unit

# Run only e2e tests
pnpm test:e2e

# Run all tests (unit + e2e)
pnpm test:all

# Run tests for CI (no watch, with coverage)
pnpm test:ci
```

### Debug Tests

```bash
# Debug tests with breakpoints
pnpm test:debug

# Debug specific test file
pnpm test:debug -- agent.service.spec.ts
```

## Test Categories

### 1. Service Tests (`*.service.spec.ts`)

Test business logic and service methods:

- **Agent Service**: CRUD operations, toolkit assignment, chat functionality
- **Workflow Service**: DSL parsing, workflow execution, agent management
- **Tools Service**: Tool discovery and toolkit management  
- **Knowledge Base Service**: File operations, vector storage, agent linking

### 2. Controller Tests (`*.controller.spec.ts`)

Test HTTP endpoints and request/response handling:

- **Agent Controller**: REST API endpoints for agent management
- **Workflow Controller**: DSL generation, workflow execution APIs
- **Toolkits Controller**: Toolkit listing and discovery

### 3. End-to-End Tests (`*.e2e-spec.ts`)

Test complete user workflows:

- **Agent E2E**: Full agent lifecycle from creation to deletion
- **Workflow E2E**: Complete workflow creation, execution, and management

## Coverage Requirements

The project maintains minimum coverage thresholds:

- **Branches**: 70%
- **Functions**: 70% 
- **Lines**: 70%
- **Statements**: 70%

Coverage reports are generated in multiple formats:
- Terminal output (text)
- HTML report (`coverage/lcov-report/index.html`)
- LCOV format for CI integration
- JSON format for programmatic access

## Writing Tests

### Test Structure

Each test file should follow this structure:

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let dependency: jest.Mocked<DependencyService>;

  beforeEach(async () => {
    // Setup test module and dependencies
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### Test Utilities

Global test utilities are available in all test files:

```typescript
// Create mock objects
const mockAgent = createMockAgent({ name: 'Custom Name' });
const mockWorkflow = createMockWorkflow({ description: 'Custom Desc' });
const mockKB = createMockKnowledgeBase({ name: 'Custom KB' });
const mockToolkit = createMockToolkit({ id: 'custom-id' });

// Mock dates for consistent testing
mockDate('2023-01-01T00:00:00Z');
// ... test code ...
restoreDate();
```

### Mocking Guidelines

1. **Mock External Dependencies**: Always mock external services and APIs
2. **Mock Database**: Use jest mocks for Prisma client methods
3. **Mock Loggers**: Console methods are automatically mocked
4. **Mock Dates**: Use `mockDate()` for time-dependent tests

### Test Data

Use the provided factory functions for consistent test data:

```typescript
// Good: Use factories
const agent = createMockAgent({ name: 'Test Agent' });

// Avoid: Manual object creation
const agent = {
  id: 'some-id',
  name: 'Test Agent',
  // ... many fields
};
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach/afterEach` for setup/cleanup
- Don't rely on test execution order

### 2. Descriptive Test Names

```typescript
// Good
it('should create agent with automatic common toolkit assignment', () => {

// Bad  
it('should create agent', () => {
```

### 3. Test Both Success and Error Cases

```typescript
describe('createAgent', () => {
  it('should create agent successfully', () => {
    // Test success path
  });

  it('should throw NotFoundException when toolkit not found', () => {
    // Test error path
  });
});
```

### 4. Use Proper Assertions

```typescript
// Good: Specific assertions
expect(result).toHaveProperty('id');
expect(result.name).toBe('Expected Name');
expect(mockService.method).toHaveBeenCalledWith(expectedArgs);

// Bad: Generic assertions
expect(result).toBeTruthy();
expect(mockService.method).toHaveBeenCalled();
```

### 5. Mock at the Right Level

```typescript
// Good: Mock the service method
mockService.findAgent.mockResolvedValue(mockAgent);

// Bad: Mock implementation details
jest.spyOn(prisma.agent, 'findUnique').mockResolvedValue(mockAgent);
```

## Debugging Tests

### Common Issues

1. **Async/Await**: Ensure all async operations use `await`
2. **Mock Cleanup**: Use `jest.restoreAllMocks()` in `afterEach`
3. **Timeout Issues**: Extend timeout for LLM-dependent tests
4. **Module Dependencies**: Check module imports and mocking

### Debug Tools

```bash
# Run specific test file
pnpm test agent.service.spec.ts

# Run specific test case
pnpm test -- --testNamePattern="should create agent"

# Run with verbose output
pnpm test -- --verbose

# Run with coverage for specific file
pnpm test:cov -- agent.service.spec.ts
```

## CI/CD Integration

The test suite is designed for CI/CD environments:

- Uses `test:ci` command for automated environments
- Generates coverage reports in multiple formats
- Includes coverage thresholds to maintain quality
- Supports parallel test execution

## File Structure

```
apps/agent-api/
├── src/
│   ├── **/*.spec.ts          # Unit tests (co-located)
│   └── test-setup.ts         # Global test configuration
├── test/
│   ├── *.e2e-spec.ts         # End-to-end tests
│   └── jest-e2e.json         # E2E Jest configuration
├── coverage/                 # Generated coverage reports
└── TESTING.md               # This file
```

## Performance

- Unit tests should run in under 10 seconds total
- E2E tests may take 30-60 seconds due to LLM interactions
- Use `--maxWorkers=50%` for optimal parallel execution
- Consider using `--bail` to stop on first failure during development