import type {
  Agent,
  Toolkit,
  Workflow,
  KnowledgeBase,
  CreateAgentDto,
  ChatWithAgentDto,
  GenerateDslDto,
  CreateWorkflowDto,
  ExecuteWorkflowDto,
  CreateKnowledgeBaseDto,
  UpdateKnowledgeBaseDto,
  ChatWithKnowledgeBaseDto
} from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

// 新的统一响应格式
export interface BaseResponse {
  success: boolean;
  message?: string;
  code?: string;
  timestamp: string;
  traceId?: string;
}

export interface DataResponse<T> extends BaseResponse {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface SuccessResponse extends BaseResponse {
  success: true;
  result: {
    affected?: number;
    operation: string;
    resourceId?: string;
  };
}

export interface PaginatedResponse<T> extends BaseResponse {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: ResponseMeta;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    type: 'VALIDATION_ERROR' | 'BUSINESS_ERROR' | 'SYSTEM_ERROR' | 'AUTH_ERROR';
    title: string;
    detail: string;
    fields?: FieldError[];
    help?: string;
  };
}

export interface FieldError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

export interface ResponseMeta {
  version?: string;
  cached?: boolean;
  executionTime?: number;
  warnings?: string[];
  [key: string]: any;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// 统一的响应类型
export type ApiResponse<T> = DataResponse<T> | ErrorResponse;
export type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponse;
export type ApiSuccessResponse = SuccessResponse | ErrorResponse;

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const responseData = await response.json();
      
      // 检查是否是标准响应格式
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        if (responseData.success === false) {
          // 错误响应，抛出业务异常
          const error = new ApiError(responseData as ErrorResponse);
          throw error;
        }
        
        // 成功响应，根据响应类型返回数据
        if ('data' in responseData) {
          return responseData.data;
        } else if ('result' in responseData) {
          return responseData as T;
        } else {
          return responseData as T;
        }
      }
      
      // 向后兼容：如果不是标准格式，直接返回
      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error(`API request failed: ${url}`, error);
      throw new ApiError({
        success: false,
        error: {
          type: 'SYSTEM_ERROR',
          title: '网络错误',
          detail: error instanceof Error ? error.message : '请求失败，请检查网络连接'
        },
        message: '网络连接失败',
        timestamp: new Date().toISOString()
      });
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

  // 分页请求 - 返回完整的分页响应
  async getPaginated<T>(
    endpoint: string, 
    params?: PaginationParams & Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const url = new URL(endpoint, API_BASE_URL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const responseData = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => res.json());

    if (responseData?.success === false) {
      throw new ApiError(responseData);
    }

    return responseData as PaginatedResponse<T>;
  }

  // Agent APIs
  async getAgents(): Promise<Agent[]> {
    return this.get<Agent[]>('agents');
  }

  async getAgentsPaginated(params?: PaginationParams): Promise<PaginatedResponse<Agent>> {
    return this.getPaginated<Agent>('agents', params);
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

  async deleteAgent(id: string): Promise<SuccessResponse> {
    return this.delete<SuccessResponse>(`agents/${id}`);
  }

  async chatWithAgent(id: string, data: ChatWithAgentDto): Promise<any> {
    return this.post<any>(`agents/${id}/chat`, data);
  }

  // Toolkit APIs
  async getToolkits(): Promise<Toolkit[]> {
    return this.get<Toolkit[]>('toolkits');
  }

  async getToolkitsPaginated(params?: PaginationParams): Promise<PaginatedResponse<Toolkit>> {
    return this.getPaginated<Toolkit>('toolkits', params);
  }

  // Workflow APIs
  async getWorkflows(): Promise<Workflow[]> {
    return this.get<Workflow[]>('workflows');
  }

  async getWorkflowsPaginated(params?: PaginationParams): Promise<PaginatedResponse<Workflow>> {
    return this.getPaginated<Workflow>('workflows', params);
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

  async deleteWorkflow(id: string): Promise<SuccessResponse> {
    return this.delete<SuccessResponse>(`workflows/${id}`);
  }

  // Knowledge Base APIs
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    return this.get<KnowledgeBase[]>('knowledge-base');
  }

  async getKnowledgeBasesPaginated(params?: PaginationParams): Promise<PaginatedResponse<KnowledgeBase>> {
    return this.getPaginated<KnowledgeBase>('knowledge-base', params);
  }

  async getKnowledgeBase(id: string): Promise<KnowledgeBase> {
    return this.get<KnowledgeBase>(`knowledge-base/${id}`);
  }

  async createKnowledgeBase(data: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    return this.post<KnowledgeBase>('knowledge-base', data);
  }

  async updateKnowledgeBase(id: string, data: UpdateKnowledgeBaseDto): Promise<KnowledgeBase> {
    return this.put<KnowledgeBase>(`knowledge-base/${id}`, data);
  }

  async deleteKnowledgeBase(id: string): Promise<SuccessResponse> {
    return this.delete<SuccessResponse>(`knowledge-base/${id}`);
  }

  async uploadFileToKnowledgeBase(knowledgeBaseId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<any>(`knowledge-base/${knowledgeBaseId}/files`, {
      method: 'POST',
      body: formData,
      headers: {}, // 不设置 Content-Type，让浏览器自动设置
    });
  }

  async trainKnowledgeBaseFile(knowledgeBaseId: string, fileId: string): Promise<any> {
    return this.post<any>(`knowledge-base/${knowledgeBaseId}/files/${fileId}/train`);
  }

  async deleteKnowledgeBaseFile(knowledgeBaseId: string, fileId: string): Promise<SuccessResponse> {
    return this.delete<SuccessResponse>(`knowledge-base/${knowledgeBaseId}/files/${fileId}`);
  }

  async queryKnowledgeBase(knowledgeBaseId: string, data: ChatWithKnowledgeBaseDto): Promise<any> {
    return this.post<any>(`knowledge-base/${knowledgeBaseId}/query`, data);
  }

  async linkKnowledgeBaseToAgent(knowledgeBaseId: string, agentId: string): Promise<any> {
    return this.post<any>(`knowledge-base/${knowledgeBaseId}/agents`, { agentId });
  }

  async unlinkKnowledgeBaseFromAgent(knowledgeBaseId: string, agentId: string): Promise<SuccessResponse> {
    return this.delete<SuccessResponse>(`knowledge-base/${knowledgeBaseId}/agents/${agentId}`);
  }
}

// API 错误类
export class ApiError extends Error {
  public readonly response: ErrorResponse;
  
  constructor(response: ErrorResponse) {
    super(response.error.detail);
    this.name = 'ApiError';
    this.response = response;
  }
  
  get title(): string {
    return this.response.error.title;
  }
  
  get type(): string {
    return this.response.error.type;
  }
  
  get fields(): FieldError[] | undefined {
    return this.response.error.fields;
  }
  
  get help(): string | undefined {
    return this.response.error.help;
  }
  
  get code(): string | undefined {
    return this.response.code;
  }
  
  get traceId(): string | undefined {
    return this.response.traceId;
  }
}

export const apiClient = new ApiClient();