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
  UseGuards,
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
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/current-user.decorator';

@Controller('knowledge-base')
@UseGuards(AuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  async getAllKnowledgeBases(
    @CurrentUser() user: CurrentUserData,
    @Query() query?: PaginationQuery
  ) {
    // 如果有分页参数，返回分页结果
    if (query?.page || query?.pageSize) {
      const { page, pageSize, skip } = validatePagination(query);
      const result = await this.knowledgeBaseService.getAllKnowledgeBasesPaginated(
        user.id,
        user.organizationId, 
        { page, pageSize, skip, search: query.search }
      );
      
      return ResponseBuilder.paginated(
        result.data,
        { page, pageSize, total: result.total },
        `获取到 ${result.data.length} 个知识库`
      );
    }

    const knowledgeBases = await this.knowledgeBaseService.getAllKnowledgeBases(user.id, user.organizationId);
    return ResponseBuilder.success(knowledgeBases, `获取到 ${knowledgeBases.length} 个知识库`);
  }

  @Get(':knowledgeBaseId')
  async getKnowledgeBase(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.getKnowledgeBase(user.id, user.organizationId, knowledgeBaseId);
    return ResponseBuilder.success(knowledgeBase, '获取知识库详情成功');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createKnowledgeBase(
    @Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const knowledgeBase = await this.knowledgeBaseService.createKnowledgeBase(
      user.id,
      user.organizationId,
      createKnowledgeBaseDto.name,
      createKnowledgeBaseDto.description || '',
      createKnowledgeBaseDto.metadataSchema,
    );
    return ResponseBuilder.created(knowledgeBase, '知识库创建成功');
  }

  @Put(':knowledgeBaseId')
  async updateKnowledgeBase(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const updatedKnowledgeBase = await this.knowledgeBaseService.updateKnowledgeBase(
      user.id,
      user.organizationId,
      knowledgeBaseId,
      updateKnowledgeBaseDto,
    );
    return ResponseBuilder.updated(updatedKnowledgeBase, '知识库更新成功');
  }

  @Delete(':knowledgeBaseId')
  async deleteKnowledgeBase(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.knowledgeBaseService.deleteKnowledgeBase(user.id, user.organizationId, knowledgeBaseId);
    return ResponseBuilder.deleted(knowledgeBaseId);
  }

  @Post(':knowledgeBaseId/files')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @UploadedFile() file: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    const uploadedFile = await this.knowledgeBaseService.uploadFile(
      user.id,
      user.organizationId,
      knowledgeBaseId,
      file,
    );
    return ResponseBuilder.success(uploadedFile, '文件上传成功');
  }

  @Get(':knowledgeBaseId/files')
  async getFiles(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const files = await this.knowledgeBaseService.getFiles(user.id, user.organizationId, knowledgeBaseId);
    return ResponseBuilder.success(files, `获取到 ${files.length} 个文件`);
  }

  @Get(':knowledgeBaseId/files/:fileId')
  async getFileStatus(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const fileStatus = await this.knowledgeBaseService.getFileStatus(user.id, user.organizationId, knowledgeBaseId, fileId);
    return ResponseBuilder.success(fileStatus, '获取文件状态成功');
  }

  @Post(':knowledgeBaseId/files/:fileId/train')
  async trainFile(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const result = await this.knowledgeBaseService.trainFile(
      user.id,
      user.organizationId,
      knowledgeBaseId,
      fileId,
    );
    return ResponseBuilder.success(result, '文件训练完成');
  }

  @Delete(':knowledgeBaseId/files/:fileId')
  async deleteFile(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.knowledgeBaseService.deleteFile(user.id, user.organizationId, knowledgeBaseId, fileId);
    return ResponseBuilder.deleted(fileId, 1);
  }

  @Post(':knowledgeBaseId/query')
  async query(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() queryDto: QueryWithMetadataDto,
  ) {
    const result = await this.knowledgeBaseService.query(
      knowledgeBaseId,
      queryDto.query,
      queryDto.metadataFilters,
    );
    return ResponseBuilder.success(result, '知识库查询成功');
  }

  @Post(':knowledgeBaseId/agents')
  async linkToAgent(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: AddKnowledgeBaseToAgentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const result = await this.knowledgeBaseService.linkKnowledgeBaseToAgent(
      user.id,
      user.organizationId,
      knowledgeBaseId,
      body.agentId,
    );
    return ResponseBuilder.success(result, '知识库已成功关联到智能体');
  }

  @Delete(':knowledgeBaseId/agents/:agentId')
  async unlinkFromAgent(
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('agentId') agentId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.knowledgeBaseService.unlinkKnowledgeBaseFromAgent(
      user.id,
      user.organizationId,
      knowledgeBaseId,
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