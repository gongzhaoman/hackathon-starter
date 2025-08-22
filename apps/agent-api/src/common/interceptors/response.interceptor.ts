import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    
    return next.handle().pipe(
      map((data) => {
        // 如果没有数据，直接返回
        if (data === null || data === undefined) {
          return data;
        }

        // 确保Content-Type为application/json
        if (!response.getHeader('Content-Type')) {
          response.setHeader('Content-Type', 'application/json');
        }

        // 根据响应数据设置HTTP状态码
        if (typeof data === 'object' && data !== null) {
          // 如果响应包含success字段，根据它设置状态码
          if ('success' in data) {
            if (data.success === false) {
              // 错误响应，根据错误类型设置状态码
              if (data.error?.type) {
                switch (data.error.type) {
                  case 'VALIDATION_ERROR':
                    response.status(400);
                    break;
                  case 'AUTH_ERROR':
                    response.status(data.code === 'ACCESS_DENIED' ? 403 : 401);
                    break;
                  case 'BUSINESS_ERROR':
                    if (data.code === 'RESOURCE_NOT_FOUND') {
                      response.status(404);
                    } else if (data.code === 'RESOURCE_ALREADY_EXISTS') {
                      response.status(409);
                    } else {
                      response.status(422); // 业务逻辑错误
                    }
                    break;
                  case 'SYSTEM_ERROR':
                    response.status(500);
                    break;
                  default:
                    response.status(400);
                }
              } else {
                response.status(400);
              }
            } else {
              // 成功响应
              if (data.result?.operation === 'create') {
                response.status(201); // Created
              } else if (data.result?.operation === 'delete') {
                response.status(200); // OK for delete operations that return data
              } else {
                response.status(200); // OK for other operations
              }
            }
          }
        }

        // 直接返回数据，不做任何包装
        return data;
      }),
    );
  }
}