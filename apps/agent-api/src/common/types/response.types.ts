// 基于2024年最佳实践的API响应类型定义

// 成功的响应直接返回数据，不需要额外包装
// 依赖HTTP状态码判断成功/失败状态

// 分页信息通过HTTP头传递，而不是嵌套在JSON中
export interface PaginationHeaders {
  'X-Total-Count': string;
  'X-Page': string; 
  'X-Per-Page': string;
  'X-Total-Pages': string;
  'Link'?: string; // RFC 5988 Web Linking
}

// 分页查询参数
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// RFC 9457 标准错误响应格式
export interface ErrorResponse {
  // 必需字段
  title: string;        // 简短的、人类可读的错误摘要
  detail: string;       // 针对此错误实例的详细解释
  
  // 推荐字段  
  type?: string;        // 错误类型的URI标识符
  status?: number;      // HTTP状态码
  instance?: string;    // 发生此错误的特定URI
  
  // 扩展字段
  timestamp?: string;   // 错误发生时间
  traceId?: string;     // 用于追踪的唯一标识符
  code?: string;        // 应用特定的错误代码
  
  // 验证错误的详细信息
  errors?: FieldError[];
}

export interface FieldError {
  field: string;        // 出错的字段名
  message: string;      // 错误描述
  code?: string;        // 字段特定的错误代码
  value?: any;          // 导致错误的值
}

// 操作结果响应 (用于删除、更新等不返回数据的操作)
export interface OperationResult {
  message: string;
  affectedCount?: number;  // 受影响的记录数
}

// 批量操作结果
export interface BatchOperationResult {
  message: string;
  total: number;
  successful: number;
  failed: number;
  errors?: BatchError[];
}

export interface BatchError {
  index: number;
  item: any;
  error: string;
}

// DTO基础类用于验证
export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;  
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// 搜索查询扩展
export interface SearchQuery extends PaginationQuery {
  q?: string;           // 搜索关键词
  filters?: Record<string, any>;
}