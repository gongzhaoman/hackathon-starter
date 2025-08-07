import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VectorStoreIndex,
  LlamaParseReader,
  MarkdownNodeParser,
} from 'llamaindex';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FileStatus } from '@prisma/client';
import { FileResponseDto, UpdateKnowledgeBaseDto } from './knowledge-base.type';

@Injectable()
export class KnowledgeBaseService {
  private uploadDir: string;
  private logger = new Logger(KnowledgeBaseService.name);

  constructor(private prisma: PrismaService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(directoryPath?: string) {
    try {
      await fs.access(directoryPath || this.uploadDir);
    } catch {
      await fs.mkdir(directoryPath || this.uploadDir, { recursive: true });
    }
  }

  private async createVectorStore(
    vectorStoreName: string,
  ): Promise<any> {
    // 简化实现，使用内存向量存储
    // 在生产环境中应该使用真正的 PGVectorStore
    this.logger.warn(`Using simplified vector store for: ${vectorStoreName}`);
    return null;
  }

  private async createIndex(
    _vectorStore?: any,
  ): Promise<VectorStoreIndex> {
    // 使用默认的内存存储
    return VectorStoreIndex.fromDocuments([]);
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

  async createKnowledgeBase(userId: string | undefined, name: string, description: string) {
    const vectorStoreName = `kb_${userId || 'default'}_${name}`;
    const knowledgeBase = await this.prisma.knowledgeBase.create({
      data: {
        name,
        description,
        vectorStoreName,
        createdById: userId,
      },
    });

    await this.createVectorStore(vectorStoreName);

    return knowledgeBase;
  }

  async deleteKnowledgeBase(
    userId: string,
    knowledgeBaseId: string,
  ): Promise<void> {
    const knowledgeBase = await this.prisma.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });

    if (!knowledgeBase || knowledgeBase.createdById !== userId) {
      throw new ForbiddenException(
        `You don't have permission to delete this knowledge base`,
      );
    }

    await this.prisma.agentKnowledgeBase.deleteMany({
      where: { knowledgeBaseId },
    });

    await this.prisma.knowledgeBase.delete({ where: { id: knowledgeBaseId } });

    const vectorStore = await this.createVectorStore(
      knowledgeBase.vectorStoreName,
    );
    await vectorStore.clearCollection();
  }

  async uploadFile(
    userId: string,
    knowledgeBaseId: string,
    file: any,
  ): Promise<FileResponseDto> {
    const knowledgeBase = await this.getKnowledgeBase(userId, knowledgeBaseId);

    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
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
      const reader = new LlamaParseReader({
        resultType: 'markdown',
      });
      const markdownParser = new MarkdownNodeParser();

      const documents = await reader.loadData(file.path);

      documents.forEach((document: any) => {
        document.doc_id = fileId;
      });

      const nodes = markdownParser.getNodesFromDocuments(documents);

      nodes.forEach((node) => {
        this.logger.log(`训练内容：${node.text}`);
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

          // 检查 vectorStore 是否存在且有 delete 方法
          if (vectorStore) {
            const index = await this.createIndex(vectorStore);

            // 尝试删除向量存储中的文档
            try {
              await vectorStore.delete(fileId);
            } catch (vectorError: any) {
              this.logger.warn(
                `Failed to delete from vector store: ${vectorError?.message || vectorError}`,
              );
            }

            // 尝试删除索引中的引用文档
            try {
              if (index && typeof index.deleteRefDoc === 'function') {
                await index.deleteRefDoc(fileId);
              }
            } catch (indexError: any) {
              this.logger.warn(
                `Failed to delete from index: ${indexError?.message || indexError}`,
              );
            }
          } else {
            this.logger.warn(
              `Vector store for ${knowledgeBase.vectorStoreName} does not support deletion or is not properly initialized`,
            );
          }
        } catch (error: any) {
          // 记录错误但不中断流程
          this.logger.error(
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

  async chat(knowledgeBaseId: string, message: string) {
    const index = await this.getIndex(knowledgeBaseId);
    const queryEngine = index.asQueryEngine({
      similarityTopK: 10,
    });

    const response = await queryEngine.query({ query: message });

    const filteredSources = response.sourceNodes
      .map((node: any) => ({
        content: node.node?.text || node.node?.getContent?.() || '',
        score: node.score || 0,
        metadata: node.node?.metadata || {},
      }))
      .sort((a, b) => b.score - a.score);

    return {
      answer: response.toString(),
      sources: filteredSources,
    };
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
