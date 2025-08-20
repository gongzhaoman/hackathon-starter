// Jest test setup file
import { PrismaService } from './prisma/prisma.service';
import { LlamaindexService } from './llamaindex/llamaindex.service';
import { ToolsService } from './tool/tools.service';

// Test-specific types for better type safety
export type MockPrismaService = Partial<PrismaService> & {
  agent: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  toolkit: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    findMany: jest.Mock;
  };
  agentToolkit: {
    create: jest.Mock;
    deleteMany: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  agentKnowledgeBase: {
    create: jest.Mock;
  };
  knowledgeBase: {
    findUnique: jest.Mock;
  };
  workflow: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  file: {
    findMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  tool: {
    upsert: jest.Mock;
  };
};

export type MockLlamaindxService = Partial<LlamaindexService> & {
  createAgent: jest.Mock;
};

export type MockToolsService = Partial<ToolsService> & {
  getToolByName: jest.Mock;
  getAgentTools: jest.Mock;
  getAgentToolkitInstances: jest.Mock;
  getToolkitInstance: jest.Mock;
};

// Basic test setup
jest.setTimeout(30000);
process.env.NODE_ENV = 'test';

// Mock console globally
const mockFn = () => {};
global.console = { ...console, log: mockFn, debug: mockFn, info: mockFn, warn: mockFn, error: mockFn };


// Mock service factory functions
global.createMockServices = () => ({
  prisma: {
    agent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    toolkit: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    agentToolkit: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    agentKnowledgeBase: {
      create: jest.fn(),
    },
    knowledgeBase: {
      findUnique: jest.fn(),
    },
    workflow: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    file: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    tool: {
      upsert: jest.fn(),
    },
  } as MockPrismaService,
  
  llamaindex: {
    createAgent: jest.fn(),
  } as MockLlamaindxService,
  
  tools: {
    getToolByName: jest.fn(),
    getAgentTools: jest.fn(),
    getAgentToolkitInstances: jest.fn(),
    getToolkitInstance: jest.fn(),
  } as MockToolsService,
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});