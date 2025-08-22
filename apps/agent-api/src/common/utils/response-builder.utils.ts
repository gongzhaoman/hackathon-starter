import { 
  DataResponse, 
  SuccessResponse, 
  PaginatedResponse, 
  ErrorResponse,
  BatchResponse,
  FieldError,
  ResponseMeta,
  OperationType,
  BusinessErrorCode 
} from '../types/api-response.types';

/**
 * 统一的响应构建工具
 * 让控制器能够轻松创建标准格式的响应
 */

// 生成追踪ID
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建成功响应（包含数据）
 */
export function success<T>(
  data: T, 
  message?: string, 
  meta?: ResponseMeta
): DataResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  };
}

/**
 * 创建操作成功响应（如删除、更新等）
 */
export function operationSuccess(
  operation: OperationType | string,
  message: string,
  options: {
    affected?: number;
    resourceId?: string;
    meta?: ResponseMeta;
  } = {}
): SuccessResponse {
  return {
    success: true,
    result: {
      operation,
      ...(options.affected !== undefined && { affected: options.affected }),
      ...(options.resourceId && { resourceId: options.resourceId })
    },
    message,
    timestamp: new Date().toISOString(),
    ...(options.meta && { meta: options.meta })
  };
}

/**
 * 创建分页响应
 */
export function paginated<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  message?: string,
  meta?: ResponseMeta
): PaginatedResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1
    },
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta })
  };
}

/**
 * 创建批量操作响应
 */
export function batchSuccess<T>(
  items: Array<{ success: boolean; data?: T; error?: string; index: number }>,
  message: string
): BatchResponse<T> {
  const successful = items.filter(item => item.success).length;
  const failed = items.length - successful;
  
  return {
    success: true,
    result: {
      total: items.length,
      successful,
      failed,
      items
    },
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建业务错误响应
 */
export function businessError(
  title: string,
  detail: string,
  code?: BusinessErrorCode | string,
  fields?: FieldError[]
): ErrorResponse {
  return {
    success: false,
    error: {
      type: 'BUSINESS_ERROR',
      title,
      detail,
      ...(fields && fields.length > 0 && { fields })
    },
    message: title,
    code,
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

/**
 * 创建验证错误响应
 */
export function validationError(
  detail: string,
  fields: FieldError[] = [],
  help?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      type: 'VALIDATION_ERROR',
      title: '输入验证失败',
      detail,
      ...(fields.length > 0 && { fields }),
      ...(help && { help })
    },
    message: '请检查输入信息',
    code: BusinessErrorCode.INVALID_INPUT,
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

/**
 * 创建权限错误响应
 */
export function authError(
  detail: string,
  code: BusinessErrorCode = BusinessErrorCode.ACCESS_DENIED
): ErrorResponse {
  return {
    success: false,
    error: {
      type: 'AUTH_ERROR',
      title: '权限不足',
      detail
    },
    message: '您没有执行此操作的权限',
    code,
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

/**
 * 创建系统错误响应
 */
export function systemError(
  detail: string = '系统内部错误，请稍后重试',
  help?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      type: 'SYSTEM_ERROR',
      title: '系统错误',
      detail,
      ...(help && { help })
    },
    message: '系统繁忙，请稍后重试',
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

/**
 * 创建资源未找到错误
 */
export function notFoundError(
  resourceType: string,
  resourceId?: string
): ErrorResponse {
  const detail = resourceId 
    ? `${resourceType} (ID: ${resourceId}) 不存在`
    : `请求的${resourceType}不存在`;
    
  return businessError(
    '资源不存在',
    detail,
    BusinessErrorCode.RESOURCE_NOT_FOUND
  );
}

/**
 * 创建资源冲突错误
 */
export function conflictError(
  detail: string,
  help?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      type: 'BUSINESS_ERROR',
      title: '资源冲突',
      detail,
      ...(help && { help })
    },
    message: '操作失败，存在冲突',
    code: BusinessErrorCode.RESOURCE_ALREADY_EXISTS,
    timestamp: new Date().toISOString(),
    traceId: generateTraceId()
  };
}

// 常用操作的快捷方法
export const ResponseBuilder = {
  // 成功响应
  success,
  created: <T>(data: T, message = '创建成功') => success(data, message),
  updated: <T>(data: T, message = '更新成功') => success(data, message),
  
  // 操作响应
  deleted: (resourceId?: string, affected = 1) => 
    operationSuccess(OperationType.DELETE, '删除成功', { resourceId, affected }),
  
  // 分页响应
  paginated,
  
  // 批量操作
  batchSuccess,
  
  // 错误响应
  businessError,
  validationError,
  authError,
  systemError,
  notFoundError,
  conflictError
};

// 分页参数验证和处理
export function validatePagination(query: any) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10));
  const skip = (page - 1) * pageSize;
  
  return { page, pageSize, skip };
}