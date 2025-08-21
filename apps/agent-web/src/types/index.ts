// API Types
export interface Agent {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  options: any;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  agentToolkits?: AgentToolkit[];
  agentKnowledgeBases?: AgentKnowledgeBase[];
}

export interface Toolkit {
  id: string;
  name: string;
  description: string;
  settings: any;
  type?: 'BUSINESS' | 'SYSTEM';
  deleted: boolean;
  tools: Tool[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  schema: any;
  toolkitId: string;
}

export interface AgentToolkit {
  id: string;
  agentId: string;
  toolkitId: string;
  settings: any;
  toolkit: Toolkit;
}

export interface AgentKnowledgeBase {
  id: string;
  agentId: string;
  knowledgeBaseId: string;
  knowledgeBase: KnowledgeBase;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  DSL: any;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ToolkitConfigDto {
  toolkitId: string;
  settings?: any;
}

export interface CreateAgentDto {
  name: string;
  description?: string;
  prompt: string;
  options?: any;
  toolkits?: ToolkitConfigDto[];
  knowledgeBases?: string[];
  workflows?: string[];
}

export interface ChatWithAgentDto {
  message: string;
  context?: any;
}

export interface GenerateDslDto {
  userMessage: string;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  dsl: any;
}

export interface ExecuteWorkflowDto {
  input: any;
  context?: any;
}

// Knowledge Base Types
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  vectorStoreName: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  files?: KnowledgeBaseFile[];
}

export interface KnowledgeBaseFile {
  id: string;
  name: string;
  path: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  knowledgeBaseId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBaseDto {
  name: string;
  description?: string;
}

export interface UpdateKnowledgeBaseDto {
  name?: string;
  description?: string;
}

export interface ChatWithKnowledgeBaseDto {
  message: string;
}
