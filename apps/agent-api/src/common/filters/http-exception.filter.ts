import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ResponseBuilder } from '../utils/response-builder.utils';
import { ErrorResponse, FieldError } from '../types/api-response.types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: ErrorResponse;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 记录日志
      this.logError(request, status, exception);

      if (typeof exceptionResponse === 'string') {
        // 简单字符串错误
        errorResponse = this.createHttpExceptionError(status, exceptionResponse, request.url);
      } else if (typeof exceptionResponse === 'object') {
        // 结构化错误响应（如ValidationPipe产生的）
        errorResponse = this.createValidationError(exceptionResponse as any, request.url);
      } else {
        errorResponse = this.createHttpExceptionError(status, '未知错误', request.url);
      }
    } else {
      // 非HTTP异常（如数据库错误、未处理的异常等）
      this.logger.error('Unhandled exception', exception?.stack || exception);
      
      errorResponse = ResponseBuilder.systemError(
        process.env.NODE_ENV === 'production' 
          ? '系统内部错误，请稍后重试'
          : exception?.message || '未知系统错误'
      );
    }

    // 响应拦截器会根据errorResponse设置正确的HTTP状态码
    response.json(errorResponse);
  }

  private createHttpExceptionError(status: number, message: string, instance: string): ErrorResponse {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ResponseBuilder.validationError(message);
      
      case HttpStatus.UNAUTHORIZED:
        return ResponseBuilder.authError('认证失败，请重新登录');
      
      case HttpStatus.FORBIDDEN:
        return ResponseBuilder.authError('权限不足，无法执行此操作');
      
      case HttpStatus.NOT_FOUND:
        return ResponseBuilder.notFoundError('资源');
      
      case HttpStatus.CONFLICT:
        return ResponseBuilder.conflictError(message);
      
      case HttpStatus.TOO_MANY_REQUESTS:
        return ResponseBuilder.businessError(
          '请求频率超限',
          '请求过于频繁，请稍后重试'
        );
      
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ResponseBuilder.validationError(message);
      
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ResponseBuilder.systemError(message);
      
      default:
        return ResponseBuilder.businessError(
          this.getHttpStatusText(status),
          message
        );
    }
  }

  private createValidationError(exceptionResponse: any, instance: string): ErrorResponse {
    // 处理class-validator产生的验证错误
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      const fields: FieldError[] = exceptionResponse.message.map((msg: string) => ({
        field: this.extractFieldFromMessage(msg),
        message: msg,
        code: 'VALIDATION_FAILED'
      }));

      return ResponseBuilder.validationError(
        '输入数据验证失败，请检查以下字段',
        fields,
        '请确保所有必填字段都已正确填写'
      );
    }

    // 处理其他结构化错误
    return ResponseBuilder.validationError(
      exceptionResponse.message || exceptionResponse.error || '验证失败'
    );
  }

  private extractFieldFromMessage(message: string): string {
    // 尝试从验证错误消息中提取字段名
    // 例如: "name should not be empty" -> "name"
    const match = message.match(/^(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private getHttpStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权访问', 
      403: '权限不足',
      404: '资源不存在',
      405: '请求方法不允许',
      409: '资源冲突',
      422: '请求参数无效',
      429: '请求过于频繁',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务暂不可用',
      504: '网关超时'
    };

    return statusTexts[status] || '未知错误';
  }

  private logError(request: Request, status: number, exception: any): void {
    const message = `${request.method} ${request.url}`;
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const ip = request.ip || 'Unknown IP';
    
    const logData = {
      method: request.method,
      url: request.url,
      status,
      userAgent,
      ip,
      body: request.body,
      query: request.query,
      params: request.params
    };
    
    if (status >= 500) {
      this.logger.error(`${message} - ${status}`, exception?.stack || exception, JSON.stringify(logData));
    } else if (status >= 400) {
      this.logger.warn(`${message} - ${status}`, JSON.stringify(logData));
    }
  }
}