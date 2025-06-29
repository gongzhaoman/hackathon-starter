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
}

export interface Toolkit {
  id: string;
  name: string;
  description: string;
  settings: any;
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
