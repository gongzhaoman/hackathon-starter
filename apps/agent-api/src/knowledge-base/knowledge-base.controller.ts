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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  CreateKnowledgeBaseDto,
  UpdateKnowledgeBaseDto,
  AddKnowledgeBaseToAgentDto,
  RemoveKnowledgeBaseFromAgentDto,
  QueryWithMetadataDto,
} from './knowledge-base.type';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  async getAllKnowledgeBases(@Query('userId') userId?: string) {
    return this.knowledgeBaseService.getAllKnowledgeBases(userId);
  }

  @Get(':id')
  async getKnowledgeBase(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ) {
    return this.knowledgeBaseService.getKnowledgeBase(userId, id);
  }

  @Post()
  async createKnowledgeBase(
    @Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto,
    @Query('userId') userId?: string,
  ) {
    return this.knowledgeBaseService.createKnowledgeBase(
      userId,
      createKnowledgeBaseDto.name,
      createKnowledgeBaseDto.description || '',
      createKnowledgeBaseDto.metadataSchema,
    );
  }

  @Put(':id')
  async updateKnowledgeBase(
    @Param('id') id: string,
    @Body() updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
    @Query('userId') userId: string,
  ) {
    await this.knowledgeBaseService.updateKnowledgeBase(
      userId,
      id,
      updateKnowledgeBaseDto,
    );
    return { message: 'Knowledge base updated successfully' };
  }

  @Delete(':id')
  async deleteKnowledgeBase(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    await this.knowledgeBaseService.deleteKnowledgeBase(userId, id);
    return { message: 'Knowledge base deleted successfully' };
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
    return {
      message: 'File uploaded successfully',
      file: uploadedFile,
    };
  }

  @Get(':id/files')
  async getFiles(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.knowledgeBaseService.getFiles(userId, id);
  }

  @Get(':id/files/:fileId')
  async getFileStatus(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('userId') userId: string,
  ) {
    return this.knowledgeBaseService.getFileStatus(userId, id, fileId);
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
    return {
      message: 'File training completed',
      status: result.status,
    };
  }

  @Delete(':id/files/:fileId')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Query('userId') userId: string,
  ) {
    await this.knowledgeBaseService.deleteFile(userId, id, fileId);
    return { message: 'File deleted successfully' };
  }

  @Post(':id/query')
  async query(
    @Param('id') id: string,
    @Body() queryDto: QueryWithMetadataDto,
  ) {
    return this.knowledgeBaseService.query(
      id,
      queryDto.query,
      queryDto.metadataFilters,
    );
  }

  @Post(':id/link-agent')
  async linkToAgent(
    @Param('id') id: string,
    @Body() body: AddKnowledgeBaseToAgentDto,
    @Query('userId') userId: string,
  ) {
    return this.knowledgeBaseService.linkKnowledgeBaseToAgent(
      userId,
      id,
      body.agentId,
    );
  }

  @Delete(':id/unlink-agent')
  async unlinkFromAgent(
    @Param('id') id: string,
    @Body() body: RemoveKnowledgeBaseFromAgentDto,
    @Query('userId') userId: string,
  ) {
    return this.knowledgeBaseService.unlinkKnowledgeBaseFromAgent(
      userId,
      id,
      body.agentId,
    );
  }

  @Get('agent/:agentId')
  async getAgentKnowledgeBases(@Param('agentId') agentId: string) {
    return this.knowledgeBaseService.getAgentKnowledgeBases(agentId);
  }
}
