import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VectorStoreIndex,
  MarkdownNodeParser,
  Document,
  VectorIndexRetriever,
} from 'llamaindex';
import type { MetadataFilter, MetadataFilters } from 'llamaindex';
import { PGVectorStore } from '@llamaindex/postgres';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FileStatus } from '@prisma/client';
import {
  FileResponseDto,
  UpdateKnowledgeBaseDto,
  TypedMetadataSchema,
  MetadataFilterRequest,
  generateFilterExamples,
  validateFilterCondition
} from './knowledge-base.type';
import * as mammoth from 'mammoth';

@Injectable()
export class KnowledgeBaseService {
  private uploadDir: string;
  private logger = new Logger(KnowledgeBaseService.name);
  private dbConfig: any;
  private readonly supportedFileTypes = ['.docx', '.md', '.markdown', '.txt'];

  constructor(private prisma: PrismaService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();

    // PostgreSQL configuration for vector store
    this.dbConfig = {
      connectionString: process.env.DATABASE_URL,
    };
  }

  private async ensureUploadDirectory(directoryPath?: string) {
    try {
      await fs.access(directoryPath || this.uploadDir);
    } catch {
      await fs.mkdir(directoryPath || this.uploadDir, { recursive: true });
    }
  }

  private validateFileType(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.supportedFileTypes.includes(ext);
  }

  private getFileTypeFromExtension(filename: string): 'docx' | 'markdown' | 'txt' {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.docx') return 'docx';
    if (ext === '.md' || ext === '.markdown') return 'markdown';
    return 'txt';
  }

  private async parseDocumentByType(filePath: string, fileId: string, filename: string, knowledgeBaseMetadata?: Record<string, any>): Promise<Document[]> {
    const fileType = this.getFileTypeFromExtension(filename);

    try {
      switch (fileType) {
        case 'docx':
          return await this.parseDocxFile(filePath, fileId, filename, knowledgeBaseMetadata);
        case 'markdown':
          return await this.parseMarkdownFile(filePath, fileId, filename, knowledgeBaseMetadata);
        case 'txt':
          return await this.parseTextFile(filePath, fileId, filename, knowledgeBaseMetadata);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse ${fileType} file ${filename}:`, error);
      throw error;
    }
  }

  private async parseDocxFile(filePath: string, fileId: string, filename: string, knowledgeBaseMetadata?: Record<string, any>): Promise<Document[]> {
    const buffer = await fs.readFile(filePath);

    // 使用 convertToMarkdown 保留标题结构，以便更好地进行分块
    // @ts-ignore - mammoth.convertToMarkdown exists but not in type definitions
    const result = await mammoth.convertToMarkdown({ buffer });

    if (!result.value.trim()) {
      throw new Error('No text content found in DOCX file');
    }

    // 记录转换过程中的消息（如果有的话）
    if (result.messages && result.messages.length > 0) {
      this.logger.log(`DOCX conversion messages for ${filename}:`, result.messages);
    }

    this.logger.log(`Converted DOCX to Markdown for ${filename}. Content preview:`,
      result.value.substring(0, 200) + '...');

    return [new Document({
      text: result.value, // 现在是 Markdown 格式，保留了标题结构
      id_: fileId,
      metadata: {
        filename,
        fileType: 'docx',
        fileId,
        convertedToMarkdown: true, // 标记已转换为 Markdown
        ...knowledgeBaseMetadata, // 添加知识库元数据
      },
    })];
  }

  private async parseMarkdownFile(filePath: string, fileId: string, filename: string, knowledgeBaseMetadata?: Record<string, any>): Promise<Document[]> {
    const content = await fs.readFile(filePath, 'utf-8');

    if (!content.trim()) {
      throw new Error('No content found in markdown file');
    }

    return [new Document({
      text: content,
      id_: fileId,
      metadata: {
        filename,
        fileType: 'markdown',
        fileId,
        ...knowledgeBaseMetadata, // 添加知识库元数据
      },
    })];
  }

  private async parseTextFile(filePath: string, fileId: string, filename: string, knowledgeBaseMetadata?: Record<string, any>): Promise<Document[]> {
    const content = await fs.readFile(filePath, 'utf-8');

    if (!content.trim()) {
      throw new Error('No content found in text file');
    }

    return [new Document({
      text: content,
      id_: fileId,
      metadata: {
        filename,
        fileType: 'txt',
        fileId,
        ...knowledgeBaseMetadata, // 添加知识库元数据
      },
    })];
  }

  private async createVectorStore(
    vectorStoreName: string,
  ): Promise<PGVectorStore> {
    try {
      const vectorStore = new PGVectorStore({
        clientConfig: this.dbConfig,
        dimensions: 1536, // OpenAI text-embedding-3-small dimensions
        tableName: `vector_${vectorStoreName.replace(/[^a-zA-Z0-9_]/g, '_')}`, // 确保表名安全
        schemaName: 'rag',
      });

      this.logger.log(`Created PGVectorStore for: ${vectorStoreName}`);
      return vectorStore;
    } catch (error) {
      this.logger.error(`Failed to create vector store for ${vectorStoreName}:`, error);
      throw error;
    }
  }

  private async createIndex(
    vectorStore: PGVectorStore,
  ): Promise<VectorStoreIndex> {
    try {
      return await VectorStoreIndex.fromVectorStore(vectorStore);
    } catch (error) {
      this.logger.error('Failed to create vector store index:', error);
      throw error;
    }
  }

  async getAllKnowledgeBases(userId?: string) {
    const whereClause = userId ? { createdById: userId } : {};
    return this.prisma.knowledgeBase.findMany({
      where: whereClause,
      include: {
        files: true,
      },
    });
  }

  async getAgentKnowledgeBases(agentId: string) {
    return this.prisma.agentKnowledgeBase.findMany({
      where: { agentId },
      include: {
        knowledgeBase: true,
      },
    });
  }

  // 专门给AI工具使用的方法，返回包含完整元数据信息的知识库列表
  async getAgentKnowledgeBasesForAI(agentId: string) {
    const agentKnowledgeBases = await this.prisma.agentKnowledgeBase.findMany({
      where: { agentId },
      include: {
        knowledgeBase: true,
      },
    });

    // 转换为AI友好的格式，包含详细的元数据schema和示例
    return agentKnowledgeBases.map((akb: any) => {
      const schema = (akb.knowledgeBase.metadata as TypedMetadataSchema) || {};
      return {
        id: akb.knowledgeBase.id,
        name: akb.knowledgeBase.name,
        description: akb.knowledgeBase.description || '',
        metadataSchema: schema,
        filterExamples: generateFilterExamples(schema),
        availableOperators: ['==', '!=', '>', '<', '>=', '<=', 'in', 'nin', 'text_match'],
        createdAt: akb.knowledgeBase.createdAt,
        updatedAt: akb.knowledgeBase.updatedAt,
      };
    });
  }

  async getKnowledgeBase(userId: string | undefined, knowledgeBaseId: string) {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
      include: {
        files: true,
      },
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`Knowledge base with ID ${knowledgeBaseId} not found`);
    }

    // 如果提供了 userId，检查权限
    if (userId && knowledgeBase.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to access this knowledge base`,
      );
    }

    return knowledgeBase;
  }

  async updateKnowledgeBase(
    userId: string,
    knowledgeBaseId: string,
    updateKnowledgeBaseDto: UpdateKnowledgeBaseDto,
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!knowledgeBase || knowledgeBase.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to update this knowledge base`,
      );
    }

    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: updateKnowledgeBaseDto,
    });
  }

  async createKnowledgeBase(userId: string | undefined, name: string, description: string, metadataSchema?: TypedMetadataSchema) {
    const vectorStoreName = `kb_${userId || 'default'}_${name}`;
    const knowledgeBase = await this.prisma.knowledgeBase.create({
      data: {
        name,
        description,
        metadata: metadataSchema as any,
        vectorStoreName,
        createdById: userId,
      },
    });

    await this.createVectorStore(vectorStoreName);

    return knowledgeBase;
  }

  async deleteKnowledgeBase(
    userId: string | undefined,
    knowledgeBaseId: string,
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`Knowledge base with ID ${knowledgeBaseId} not found`);
    }

    // 权限检查：如果提供了userId，则检查权限；如果知识库有createdById且与userId不匹配，则拒绝
    if (userId && knowledgeBase.createdById && knowledgeBase.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to delete this knowledge base`,
      );
    }

    await this.prisma.agentKnowledgeBase.deleteMany({
      where: { knowledgeBaseId },
    });

    await this.prisma.knowledgeBase.delete({ where: { id: knowledgeBaseId } });

    try {
      const vectorStore = await this.createVectorStore(
        knowledgeBase.vectorStoreName,
      );
      await vectorStore.clearCollection();
      this.logger.log(`Cleared vector collection for: ${knowledgeBase.vectorStoreName}`);
    } catch (error) {
      this.logger.warn(`Failed to clear vector collection for ${knowledgeBase.vectorStoreName}:`, error);
      // 不抛出错误，因为数据库记录已删除
    }
  }

  async uploadFile(
    userId: string,
    knowledgeBaseId: string,
    file: any,
  ): Promise<FileResponseDto> {
    const knowledgeBase = await this.getKnowledgeBase(userId, knowledgeBaseId);

    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 验证文件类型
    if (!this.validateFileType(fileName)) {
      throw new ForbiddenException(
        `Unsupported file type. Only ${this.supportedFileTypes.join(', ')} files are allowed.`
      );
    }

    const directoryPath = path.join(this.uploadDir, randomUUID());
    await this.ensureUploadDirectory(directoryPath);
    const filePath = path.join(directoryPath, fileName);

    await fs.writeFile(filePath, file.buffer);

    return await this.prisma.file.create({
      data: {
        path: filePath,
        name: fileName,
        knowledgeBaseId: knowledgeBase.id,
        status: FileStatus.PENDING,
      },
    });
  }

  async getFiles(
    userId: string,
    knowledgeBaseId: string,
  ): Promise<FileResponseDto[]> {
    await this.getKnowledgeBase(userId, knowledgeBaseId);
    return this.prisma.file.findMany({
      where: { knowledgeBaseId },
    });
  }

  async getFileStatus(
    userId: string,
    knowledgeBaseId: string,
    fileId: string,
  ): Promise<FileResponseDto> {
    await this.getKnowledgeBase(userId, knowledgeBaseId);
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.knowledgeBaseId !== knowledgeBaseId) {
      throw new NotFoundException(`File not found`);
    }

    return file;
  }

  async trainFile(
    userId: string,
    knowledgeBaseId: string,
    fileId: string,
  ): Promise<FileResponseDto> {
    const knowledgeBase = await this.getKnowledgeBase(userId, knowledgeBaseId);
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.knowledgeBaseId !== knowledgeBaseId) {
      throw new NotFoundException(`File not found`);
    }

    try {
      // 从知识库schema中提取默认元数据值
      const schema = (knowledgeBase as any).metadata as TypedMetadataSchema || {};
      const defaultMetadata = this.extractDefaultMetadata(schema);

      // 使用新的文档解析器，传递默认元数据
      const documents = await this.parseDocumentByType(file.path, fileId, file.name, defaultMetadata);

      // 使用 MarkdownNodeParser 来分割文档
      const markdownParser = new MarkdownNodeParser();
      const nodes = markdownParser.getNodesFromDocuments(documents);

      this.logger.log(`Parsed ${documents.length} documents into ${nodes.length} nodes for file: ${file.name}`);

      nodes.forEach((node, index) => {
        this.logger.log(`Node ${index + 1}: ${node.text.substring(0, 200)}...`);
      });

      const vectorStore = await this.createVectorStore(
        knowledgeBase.vectorStoreName,
      );

      const index = await this.createIndex(vectorStore);

      await index.insertNodes(nodes);

      return await this.prisma.file.update({
        where: { id: fileId },
        data: { status: FileStatus.PROCESSED },
      });
    } catch (error) {
      this.logger.error(`Failed to train file ${file.path}:`, error);
      return await this.prisma.file.update({
        where: { id: fileId },
        data: { status: FileStatus.FAILED },
      });
    }
  }

  async deleteFile(
    userId: string,
    knowledgeBaseId: string,
    fileId: string,
  ): Promise<void> {
    return this.prisma.$transaction(async (prisma) => {
      // 1. 验证权限和获取必要数据
      const knowledgeBase = await this.getKnowledgeBase(
        userId,
        knowledgeBaseId,
      );

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.knowledgeBaseId !== knowledgeBaseId) {
        throw new NotFoundException(`File not found`);
      }

      try {
        // 2. 删除物理文件
        try {
          await fs.access(file.path);
          await fs.unlink(file.path);

          // 删除空目录
          const directoryPath = path.dirname(file.path);
          const files = await fs.readdir(directoryPath);
          if (files.length === 0) {
            await fs.rmdir(directoryPath);
          }
        } catch (error: any) {
          // 如果文件不存在，只记录警告但继续执行
          this.logger.warn(
            `Physical file ${file.path} does not exist or cannot be accessed: ${error?.message || error}`,
          );
        }

        // 3. 删除向量存储中的数据
        try {
          const vectorStore = await this.createVectorStore(
            knowledgeBase.vectorStoreName,
          );

          // 尝试删除向量存储中的文档
          await vectorStore.delete(fileId);
          this.logger.log(`Deleted vector data for file ${fileId} from ${knowledgeBase.vectorStoreName}`);
        } catch (error: any) {
          // 记录错误但不中断流程
          this.logger.warn(
            `Failed to delete vector store data for file ${fileId}: ${error?.message || error}`,
          );
        }

        // 4. 删除数据库记录
        await prisma.file.delete({
          where: { id: fileId },
        });
      } catch (error: any) {
        this.logger.error(`Failed to delete file ${fileId}: ${error?.message || error}`);
        throw error; // 让事务回滚
      }
    });
  }

  async getIndex(knowledgeBaseId: string): Promise<VectorStoreIndex> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });
    if (!knowledgeBase) {
      throw new NotFoundException('Knowledge base not found');
    }

    const vectorStore = await this.createVectorStore(
      knowledgeBase.vectorStoreName,
    );
    return await this.createIndex(vectorStore);
  }

  async query(knowledgeBaseId: string, query: string, metadataFilters?: MetadataFilterRequest) {
    const index = await this.getIndex(knowledgeBaseId);

    // 获取知识库的元数据schema用于验证
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!knowledgeBase) {
      throw new NotFoundException('Knowledge base not found');
    }

    const schema = (knowledgeBase as any).metadata as TypedMetadataSchema || {};

    // 构建元数据过滤器
    let filters: MetadataFilters | undefined;
    if (metadataFilters && metadataFilters.filters && metadataFilters.filters.length > 0) {
      // 验证过滤条件
      for (const condition of metadataFilters.filters) {
        const validation = validateFilterCondition(condition, schema);
        if (!validation.valid) {
          this.logger.warn(`过滤条件验证失败: ${validation.error}`);
          // 可以选择抛出错误或忽略无效条件
          // throw new BadRequestException(validation.error);
        }
      }

      filters = this.buildMetadataFilters(metadataFilters);
    }

    // 直接使用VectorIndexRetriever的filter参数
    const retriever = new VectorIndexRetriever({
      index,
      similarityTopK: 20, // 先获取20个结果用于筛选
      filters, // 直接传递过滤器
    });

    const nodes = await retriever.retrieve({ query });

    // 处理结果
    const sources = nodes
      .map((node: any) => ({
        content: node.node?.text || node.node?.getContent?.() || '',
        score: node.score || 0,
        metadata: node.node?.metadata || {},
      }))
      .sort((a, b) => b.score - a.score);

    // 应用过滤逻辑：最少5条，最多10条，超过5条意味着得分都大于9
    let filteredSources = sources;

    if (sources.length > 5) {
      // 找出得分大于9的结果
      const highScoreSources = sources.filter(source => source.score > 9);

      if (highScoreSources.length >= 5) {
        // 如果高分结果≥5个，返回最多10个高分结果
        filteredSources = highScoreSources.slice(0, 10);
      } else {
        // 如果高分结果<5个，返回前5个结果
        filteredSources = sources.slice(0, 5);
      }
    } else {
      // 如果总结果≤5个，返回所有结果
      filteredSources = sources;
    }

    return {
      sources: filteredSources,
      totalFound: sources.length,
      returned: filteredSources.length,
    };
  }

  // 构建LlamaIndex的MetadataFilters
  private buildMetadataFilters(filterRequest: MetadataFilterRequest): MetadataFilters {
    const filterList: MetadataFilter[] = filterRequest.filters.map(condition => ({
      key: condition.key,
      value: condition.value,
      operator: condition.operator,
    }));

    // LlamaIndex期望小写的condition
    const condition = (filterRequest.condition || 'AND').toLowerCase() as 'and' | 'or';

    return {
      filters: filterList,
      condition,
    };
  }


  // 从元数据schema中提取默认值
  private extractDefaultMetadata(schema: TypedMetadataSchema): Record<string, any> {
    const metadata: Record<string, any> = {};

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      // 使用schema中定义的example作为默认值
      if (fieldDef.example !== undefined) {
        metadata[fieldName] = fieldDef.example;
      }
    }

    return metadata;
  }

  async linkKnowledgeBaseToAgent(
    userId: string,
    knowledgeBaseId: string,
    agentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const knowledgeBase = await this.getKnowledgeBase(userId, knowledgeBaseId);
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to link this agent`,
      );
    }

    // 检查是否已经存在链接
    const existingLink = await this.prisma.agentKnowledgeBase.findUnique({
      where: {
        agentId_knowledgeBaseId: {
          agentId: agent.id,
          knowledgeBaseId: knowledgeBase.id,
        },
      },
    });

    if (existingLink) {
      return {
        success: false,
        message: 'Knowledge base already linked to agent',
      };
    }

    await this.prisma.agentKnowledgeBase.create({
      data: {
        agentId: agent.id,
        knowledgeBaseId: knowledgeBase.id,
      },
    });

    return { success: true, message: 'Knowledge base linked to agent' };
  }

  async unlinkKnowledgeBaseFromAgent(
    userId: string,
    knowledgeBaseId: string,
    agentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const knowledgeBase = await this.getKnowledgeBase(userId, knowledgeBaseId);
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to unlink this agent`,
      );
    }

    await this.prisma.agentKnowledgeBase.delete({
      where: {
        agentId_knowledgeBaseId: {
          agentId: agent.id,
          knowledgeBaseId: knowledgeBase.id,
        },
      },
    });

    return { success: true, message: 'Knowledge base unlinked from agent' };
  }
}
