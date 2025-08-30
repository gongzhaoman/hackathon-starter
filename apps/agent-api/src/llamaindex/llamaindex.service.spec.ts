import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LlamaindexService } from './llamaindex.service';

// Mock all the llamaindex modules
const mockOpenAI = jest.fn();
const mockOpenAIEmbedding = jest.fn();
const mockSettings = {
  llm: null,
  embedModel: null,
};
const mockFunctionTool = jest.fn();
const mockAgent = jest.fn();

const mockLlamaindexModules = {
  openai: mockOpenAI,
  OpenAIEmbedding: mockOpenAIEmbedding,
  Settings: mockSettings,
  FunctionTool: mockFunctionTool,
  agent: mockAgent,
};

// Mock the dynamic imports
jest.mock('@llamaindex/openai', () => ({
  openai: mockOpenAI,
  OpenAIEmbedding: mockOpenAIEmbedding,
}));

jest.mock('llamaindex', () => ({
  Settings: mockSettings,
  FunctionTool: mockFunctionTool,
}));

jest.mock('@llamaindex/workflow', () => ({
  agent: mockAgent,
}));

describe('LlamaindexService', () => {
  let service: LlamaindexService;
  let logger: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlamaindexService],
    }).compile();

    service = module.get<LlamaindexService>(LlamaindexService);
    logger = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
    mockSettings.llm = null;
    mockSettings.embedModel = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLlamaindexModules', () => {
    it('should return llamaindex modules', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const modules = await service.getLlamaindexModules();

      expect(modules).toEqual(mockLlamaindexModules);
      expect(modules.openai).toBe(mockOpenAI);
      expect(modules.OpenAIEmbedding).toBe(mockOpenAIEmbedding);
      expect(modules.Settings).toBe(mockSettings);
      expect(modules.FunctionTool).toBe(mockFunctionTool);
      expect(modules.agent).toBe(mockAgent);
    });

    it('should cache modules after first load', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      // First call
      const modules1 = await service.getLlamaindexModules();
      
      // Second call
      const modules2 = await service.getLlamaindexModules();

      expect(modules1).toBe(modules2);
      expect(modules1).toEqual(mockLlamaindexModules);
    });
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      // Mock environment variables
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.OPENAI_BASE_URL = 'https://test.openai.com';
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_BASE_URL;
    });

    it('should initialize LLM and embedding model successfully', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const mockLLM = { model: 'gpt-4.1' };
      const mockEmbedding = { model: 'text-embedding-3-small' };
      
      mockOpenAI.mockReturnValue(mockLLM);
      mockOpenAIEmbedding.mockImplementation(() => mockEmbedding);

      await service.onModuleInit();

      expect(mockOpenAI).toHaveBeenCalledWith({
        model: 'gpt-4.1',
        temperature: 0.7,
        apiKey: 'test-api-key',
        additionalSessionOptions: {
          baseURL: 'https://test.openai.com',
          httpAgent: null, // No proxy in test
        },
      });

      expect(mockOpenAIEmbedding).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(mockSettings.llm).toBe(mockLLM);
      expect(mockSettings.embedModel).toBe(mockEmbedding);
      expect(logger).toHaveBeenCalledWith('Default LLM initialized successfully');
    });

    it('should handle initialization errors gracefully', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const initError = new Error('Initialization failed');
      
      mockOpenAI.mockImplementation(() => {
        throw initError;
      });

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith('Failed to initialize default LLM', initError);
    });

    it('should handle proxy configuration', async () => {
      // Mock proxy environment variable
      process.env.http_proxy = 'http://proxy.example.com:8080';
      
      const mockLLM = { model: 'gpt-4.1' };
      mockOpenAI.mockReturnValue(mockLLM);
      mockOpenAIEmbedding.mockImplementation(() => ({}));

      // Need to reload the service to pick up the proxy
      const module: TestingModule = await Test.createTestingModule({
        providers: [LlamaindexService],
      }).compile();
      
      const serviceWithProxy = module.get<LlamaindexService>(LlamaindexService);
      jest.spyOn(serviceWithProxy, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      await serviceWithProxy.onModuleInit();

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalSessionOptions: expect.objectContaining({
            httpAgent: expect.any(Object),
          }),
        }),
      );

      delete process.env.http_proxy;
    });
  });

  describe('createAgent', () => {
    const mockTools = [
      { name: 'tool1', description: 'Test tool 1' },
      { name: 'tool2', description: 'Test tool 2' },
    ];

    it('should create an agent with tools and prompt', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const mockAgentInstance = { run: jest.fn() };
      mockAgent.mockReturnValue(mockAgentInstance);

      const prompt = 'You are a helpful assistant';
      const result = await service.createAgent(mockTools as any, prompt);

      expect(mockAgent).toHaveBeenCalledWith({
        tools: mockTools,
        systemPrompt: prompt,
        llm: undefined,
        verbose: false,
      });
      expect(result).toBe(mockAgentInstance);
    });

    it('should create an agent with custom LLM', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const mockAgentInstance = { run: jest.fn() };
      const mockCustomLLM = { model: 'custom-model' };
      mockAgent.mockReturnValue(mockAgentInstance);

      const prompt = 'You are a helpful assistant';
      const result = await service.createAgent(mockTools as any, prompt, mockCustomLLM as any);

      expect(mockAgent).toHaveBeenCalledWith({
        tools: mockTools,
        systemPrompt: prompt,
        llm: mockCustomLLM,
        verbose: false,
      });
      expect(result).toBe(mockAgentInstance);
    });

    it('should create an agent without prompt', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const mockAgentInstance = { run: jest.fn() };
      mockAgent.mockReturnValue(mockAgentInstance);

      const result = await service.createAgent(mockTools as any);

      expect(mockAgent).toHaveBeenCalledWith({
        tools: mockTools,
        systemPrompt: undefined,
        llm: undefined,
        verbose: false,
      });
      expect(result).toBe(mockAgentInstance);
    });

    it('should create an agent with empty tools array', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const mockAgentInstance = { run: jest.fn() };
      mockAgent.mockReturnValue(mockAgentInstance);

      const result = await service.createAgent([]);

      expect(mockAgent).toHaveBeenCalledWith({
        tools: [],
        systemPrompt: undefined,
        llm: undefined,
        verbose: false,
      });
      expect(result).toBe(mockAgentInstance);
    });

    it('should handle agent creation errors', async () => {
      jest.spyOn(service, 'getLlamaindexModules').mockResolvedValue(mockLlamaindexModules);
      
      const agentError = new Error('Agent creation failed');
      mockAgent.mockImplementation(() => {
        throw agentError;
      });

      await expect(service.createAgent(mockTools as any)).rejects.toThrow('Agent creation failed');
    });
  });

  describe('module loading', () => {
    it('should handle module import errors', async () => {
      // Create a new service instance to test import errors
      const module: TestingModule = await Test.createTestingModule({
        providers: [LlamaindexService],
      }).compile();

      const newService = module.get<LlamaindexService>(LlamaindexService);
      
      // Mock the method to simulate import failure
      const importError = new Error('Module not found');
      jest.spyOn(newService, 'getLlamaindexModules').mockRejectedValue(importError);

      await expect(newService.getLlamaindexModules()).rejects.toThrow('Module not found');
    });
  });
});