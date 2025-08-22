import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  CreateKnowledgeBaseDto,
  UpdateKnowledgeBaseDto,
  AddKnowledgeBaseToAgentDto,
  QueryWithMetadataDto,
} from './knowledge-base.type';
import type { PaginationQuery } from '../common/types/api-response.types';
import { ResponseBuilder, validatePagination } from '../common/utils/response-builder.utils';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  async getAllKnowledgeBases(
    @Query('userId') userId?: string,
    @Query() query?: PaginationQuery
  ) {
    // 如果有分页参数，返回分页结果
    if (query?.page || query?.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.knowledgeBaseService.getAllKnowledgeBasesPaginated(
        userId, 
        { page, pageSize, skip, search: query.search }
      );
      
      return ResponseBuilder.paginated(
        result.data,
        { page, pageSize, total: result.total },
        `获取到 ${result.data.length} 个知识库`
      );
    }

    const knowledgeBases = await this.knowledgeBaseService.getAllKnowledgeBases(userId);
    return ResponseBuilder.success(knowledgeBases, `获取到 ${knowledgeBases.length} 个知识库`);
  }

  @Get(':id')
  async getKnowledgeBase(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.getKnowledgeBase(userId, id);
    return ResponseBuilder.success(knowledgeBase, '获取知识库详情成功');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createKnowledgeBase(
    @Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto,
    @Query('userId') userId?: string,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.createKnowledgeBase(
      userId,
      createKnowledgeBaseDto.name,
      createKnowledgeBaseDto.description || '',
      createKnowledgeBaseDto.metadataSchema,
    );
    return ResponseBuilder.created(knowledgeBase, '知识库创建成功');
  }

  @Put(':id')
  async updateKnowledgeBase(
    @Param('id') id: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @Query('userId') userId: string,
  ) {
    const updatedKnowledgeBase = await this.knowledgeBaseService.updateKnowledgeBase(
      userId,
      id,
      updateKnowledgeBaseDto,
    );
    return ResponseBuilder.updated(updatedKnowledgeBase, '知识库更新成功');
  }

  @Delete(':id')
  async deleteKnowledgeBase(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    await this.knowledgeBaseService.deleteKnowledgeBase(userId, id);
    return ResponseBuilder.deleted(id);
  }

  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Query('userId') userId: string,
  ) {
    const uploadedFile = await this.knowledgeBaseService.uploadFile(
      userId,
      id,
      file,
    );
    return ResponseBuilder.success(uploadedFile, '文件上传成功');
  }

  @Get(':id/files')
  async getFiles(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    const files = await this.knowledgeBaseService.getFiles(userId, id);
    return ResponseBuilder.success(files, `获取到 ${files.length} 个文件`);
  }

  @Get(':id/files/:fileId')
  async getFileStatus(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('userId') userId: string,
  ) {
    const fileStatus = await this.knowledgeBaseService.getFileStatus(userId, id, fileId);
    return ResponseBuilder.success(fileStatus, '获取文件状态成功');
  }

  @Post(':id/files/:fileId/train')
  async trainFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('userId') userId: string,
  ) {
    const result = await this.knowledgeBaseService.trainFile(
      userId,
      id,
      fileId,
    );
    return ResponseBuilder.success(result, '文件训练完成');
  }

  @Delete(':id/files/:fileId')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('userId') userId: string,
  ) {
    await this.knowledgeBaseService.deleteFile(userId, id, fileId);
    return ResponseBuilder.deleted(fileId, 1);
  }

  @Post(':id/query')
  async query(
    @Param('id') id: string,
    @Body() queryDto: QueryWithMetadataDto,
  ) {
    const result = await this.knowledgeBaseService.query(
      id,
      queryDto.query,
      queryDto.metadataFilters,
    );
    return ResponseBuilder.success(result, '知识库查询成功');
  }

  @Post(':id/agents')
  async linkToAgent(
    @Param('id') id: string,
    @Body() body: AddKnowledgeBaseToAgentDto,
    @Query('userId') userId: string,
  ) {
    const result = await this.knowledgeBaseService.linkKnowledgeBaseToAgent(
      userId,
      id,
      body.agentId,
    );
    return ResponseBuilder.success(result, '知识库已成功关联到智能体');
  }

  @Delete(':id/agents/:agentId')
  async unlinkFromAgent(
    @Param('id') id: string,
    @Param('agentId') agentId: string,
    @Query('userId') userId: string,
  ) {
    await this.knowledgeBaseService.unlinkKnowledgeBaseFromAgent(
      userId,
      id,
      agentId,
    );
    return ResponseBuilder.deleted(agentId, 1);
  }

  @Get('agent/:agentId')
  async getAgentKnowledgeBases(@Param('agentId') agentId: string) {
    const knowledgeBases = await this.knowledgeBaseService.getAgentKnowledgeBases(agentId);
    return ResponseBuilder.success(knowledgeBases, `获取到 ${knowledgeBases.length} 个关联的知识库`);
  }
}