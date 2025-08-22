/**
 * 基于业务实践的统一API响应格式
 * 优点：前端处理简单、错误信息丰富、调试方便
 */

// 基础响应接口
export interface BaseResponse {
  success: boolean;           // 操作是否成功
  message?: string;          // 用户友好的消息（可直接展示给用户）
  code?: string;             // 业务错误码（用于前端逻辑判断）
  timestamp: string;         // 响应时间
  traceId?: string;          // 请求追踪ID（用于调试）
}

// 成功响应 - 返回数据
export interface DataResponse<T> extends BaseResponse {
  success: true;
  data: T;                   // 实际的业务数据
  meta?: ResponseMeta;       // 额外的元数据
}

// 成功响应 - 无数据返回（如删除操作）
export interface SuccessResponse extends BaseResponse {
  success: true;
  result: {
    affected?: number;       // 受影响的记录数
    operation: string;       // 执行的操作类型
    resourceId?: string;     // 操作的资源ID
  };
}

// 分页响应
export interface PaginatedResponse<T> extends BaseResponse {
  success: true;
  data: T[];
  pagination: {
    page: number;            // 当前页
    pageSize: number;        // 每页大小
    total: number;           // 总记录数
    totalPages: number;      // 总页数
    hasNext: boolean;        // 是否有下一页
    hasPrev: boolean;        // 是否有上一页
  };
  meta?: ResponseMeta;
}

// 失败响应
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    type: 'VALIDATION_ERROR' | 'BUSINESS_ERROR' | 'SYSTEM_ERROR' | 'AUTH_ERROR';
    title: string;           // 错误标题
    detail: string;          // 详细描述
    fields?: FieldError[];   // 字段级错误（用于表单验证）
    help?: string;          // 帮助信息或解决建议
  };
}

// 字段错误
export interface FieldError {
  field: string;             // 字段名
  message: string;           // 错误消息
  code?: string;             // 错误码
  value?: any;               // 导致错误的值
}

// 响应元数据
export interface ResponseMeta {
  version?: string;          // API版本
  cached?: boolean;          // 是否来自缓存
  executionTime?: number;    // 执行时间(ms)
  warnings?: string[];       // 警告信息
  [key: string]: any;        // 其他自定义元数据
}

// 批量操作响应
export interface BatchResponse<T> extends BaseResponse {
  success: true;
  result: {
    total: number;           // 总操作数
    successful: number;      // 成功数
    failed: number;          // 失败数
    items: BatchItem<T>[];   // 详细结果
  };
}

export interface BatchItem<T> {
  success: boolean;
  data?: T;
  error?: string;
  index: number;             // 在批量操作中的索引
}

// 统一的响应类型
export type ApiResponse<T> = DataResponse<T> | ErrorResponse;
export type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponse;
export type ApiSuccessResponse = SuccessResponse | ErrorResponse;
export type ApiBatchResponse<T> = BatchResponse<T> | ErrorResponse;

// 分页查询参数
export interface PaginationQuery {
  page?: number;
  pageSize?: number;         // 改名为pageSize，更直观
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;           // 全局搜索
}

// 操作类型枚举
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update', 
  DELETE = 'delete',
  BATCH_CREATE = 'batch_create',
  BATCH_UPDATE = 'batch_update',
  BATCH_DELETE = 'batch_delete',
}

// 业务错误码枚举
export enum BusinessErrorCode {
  // 资源相关
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE = 'RESOURCE_IN_USE',
  
  // 权限相关
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // 验证相关
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // 业务逻辑
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
}