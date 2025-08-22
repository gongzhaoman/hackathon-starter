import { Controller, Get, Query } from '@nestjs/common';
import { ToolkitsService } from './toolkits.service';
import type { PaginationQuery } from '../common/types/api-response.types';
import { ResponseBuilder, validatePagination } from '../common/utils/response-builder.utils';

@Controller('toolkits')
export class ToolkitsController {
  constructor(private readonly toolkitsService: ToolkitsService) {}

  @Get()
  async getAllToolkits(@Query() query?: PaginationQuery) {
    // 如果有分页参数，返回分页结果
    if (query?.page || query?.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.toolkitsService.getAllToolkitsPaginated({
        page,
        pageSize,
        skip,
        search: query.search
      });
      
      return ResponseBuilder.paginated(
        result.data,
        { page, pageSize, total: result.total },
        `获取到 ${result.data.length} 个工具包`
      );
    }

    const toolkits = await this.toolkitsService.getAllToolkits();
    return ResponseBuilder.success(toolkits, `获取到 ${toolkits.length} 个工具包`);
  }
}
