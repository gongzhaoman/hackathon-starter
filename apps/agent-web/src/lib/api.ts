import type {
  Agent,
  Toolkit,
  Workflow,
  CreateAgentDto,
  ChatWithAgentDto,
  GenerateDslDto,
  CreateWorkflowDto,
  ExecuteWorkflowDto
} from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // GET 请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, API_BASE_URL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  // POST 请求
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 请求
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Agent APIs
  async getAgents(): Promise<Agent[]> {
    return this.get<Agent[]>('agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.get<Agent>(`agents/${id}`);
  }

  async createAgent(data: CreateAgentDto): Promise<Agent> {
    return this.post<Agent>('agents', data);
  }

  async updateAgent(id: string, data: Partial<CreateAgentDto>): Promise<Agent> {
    return this.put<Agent>(`agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.delete<void>(`agents/${id}`);
  }

  async chatWithAgent(id: string, data: ChatWithAgentDto): Promise<any> {
    return this.post<any>(`agents/${id}/chat`, data);
  }

  // Toolkit APIs
  async getToolkits(): Promise<Toolkit[]> {
    return this.get<Toolkit[]>('toolkits');
  }

  // Workflow APIs
  async getWorkflows(): Promise<Workflow[]> {
    return this.get<Workflow[]>('workflows');
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.get<Workflow>(`workflows/${id}`);
  }

  async generateDsl(data: GenerateDslDto): Promise<{ dsl: any }> {
    return this.post<{ dsl: any }>('workflows/generate-dsl', data);
  }

  async createWorkflow(data: CreateWorkflowDto): Promise<Workflow> {
    return this.post<Workflow>('workflows', data);
  }

  async executeWorkflow(id: string, data: ExecuteWorkflowDto): Promise<any> {
    return this.post<any>(`workflows/${id}/execute`, data);
  }

  async deleteWorkflow(id: string): Promise<void> {
    return this.delete<void>(`workflows/${id}`);
  }
}

export const apiClient = new ApiClient();
