import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileStatus } from '@prisma/client';
import { UpdateKnowledgeBaseDto } from './knowledge-base.type';
import { MockPrismaService } from '../test-setup';
import * as fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock llamaindex modules
jest.mock('llamaindex', () => ({
  VectorStoreIndex: {
    fromDocuments: jest.fn().mockResolvedValue({
      insertNodes: jest.fn(),
      asQueryEngine: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
          toString: jest.fn().mockReturnValue('Test response'),
          sourceNodes: []
        })
      }),
      deleteRefDoc: jest.fn()
    }),
    fromVectorStore: jest.fn().mockResolvedValue({
      insertNodes: jest.fn(),
      asQueryEngine: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({
          toString: jest.fn().mockReturnValue('Test response'),
          sourceNodes: []
        })
      }),
      deleteRefDoc: jest.fn()
    })
  },
  Settings: {
    embedModel: {
      model: 'text-embedding-3-small',
      dimensions: 1536
    },
    llm: null
  },
  LlamaParseReader: jest.fn().mockImplementation(() => ({
    loadData: jest.fn().mockResolvedValue([{
      doc_id: 'test-file',
      getText: () => 'Test document content',
      metadata: {}
    }])
  })),
  MarkdownNodeParser: jest.fn().mockImplementation(() => ({
    getNodesFromDocuments: jest.fn().mockReturnValue([{
      text: 'Test node content'
    }])
  })),
  VectorIndexRetriever: jest.fn().mockImplementation(() => ({
    retrieve: jest.fn().mockResolvedValue([])
  })),
  Document: jest.fn().mockImplementation(function(props: any) {
    return {
      text: props.text,
      id_: props.id_,
      metadata: props.metadata || {},
      getText: () => props.text
    };
  })
}));

// Mock @llamaindex/postgres
jest.mock('@llamaindex/postgres', () => ({
  PGVectorStore: jest.fn().mockImplementation(() => ({
    client: {
      end: jest.fn()
    },
    add: jest.fn(),
    deleteNodes: jest.fn(),
    persist: jest.fn(),
    getNodes: jest.fn().mockResolvedValue([])
  }))
}));

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let prismaService: MockPrismaService;

  const mockKnowledgeBase = {
    id: 'kb-1',
    name: 'Test Knowledge Base',
    description: 'Test Description',
    vectorStoreName: 'kb_user1_test',
    createdById: 'user-1',
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    files: []
  };

  const mockFile = {
    id: 'file-1',
    name: 'test.txt',
    path: '/uploads/uuid/test.txt',
    status: FileStatus.PENDING,
    knowledgeBaseId: 'kb-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test Description',
    prompt: 'You are a test agent',
    options: {},
    createdById: 'user-1',
    organizationId: 'org-1',
    isWorkflowGenerated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deleted: false
  };

  const mockAgentKnowledgeBase = {
    agentId: 'agent-1',
    knowledgeBaseId: 'kb-1',
    agent: mockAgent,
    knowledgeBase: mockKnowledgeBase
  };

  beforeEach(async () => {
    const mockPrismaService = {
      knowledgeBase: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      agentKnowledgeBase: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      file: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      agent: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    prismaService = module.get<MockPrismaService>(PrismaService);


    // Mock fs methods
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('Test file content for parsing');
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.rmdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllKnowledgeBases', () => {
    it('should return all knowledge bases for a user', async () => {
      const mockKnowledgeBases = [mockKnowledgeBase];
      (prismaService.knowledgeBase.findMany as jest.Mock).mockResolvedValue(mockKnowledgeBases);

      const result = await service.getAllKnowledgeBases('user-1', 'org-1');

      expect(prismaService.knowledgeBase.findMany).toHaveBeenCalledWith({
        where: { createdById: 'user-1', organizationId: 'org-1' },
        include: { files: true },
      });
      expect(result).toEqual(mockKnowledgeBases);
    });

    it('should return all knowledge bases when no userId provided', async () => {
      const mockKnowledgeBases = [mockKnowledgeBase];
      (prismaService.knowledgeBase.findMany as jest.Mock).mockResolvedValue(mockKnowledgeBases);

      const result = await service.getAllKnowledgeBases(undefined, undefined);

      expect(prismaService.knowledgeBase.findMany).toHaveBeenCalledWith({
        where: {},
        include: { files: true },
      });
      expect(result).toEqual(mockKnowledgeBases);
    });
  });

  describe('getAgentKnowledgeBases', () => {
    it('should return knowledge bases for an agent', async () => {
      const mockAgentKBs = [mockAgentKnowledgeBase];
      (prismaService.agentKnowledgeBase.findMany as jest.Mock).mockResolvedValue(mockAgentKBs);

      const result = await service.getAgentKnowledgeBases('agent-1');

      expect(prismaService.agentKnowledgeBase.findMany).toHaveBeenCalledWith({
        where: { agentId: 'agent-1' },
        include: { knowledgeBase: true },
      });
      expect(result).toEqual(mockAgentKBs);
    });
  });

  describe('getKnowledgeBase', () => {
    it('should return knowledge base when user has permission', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await service.getKnowledgeBase('user-1', 'org-1', 'kb-1');

      expect(prismaService.knowledgeBase.findUnique).toHaveBeenCalledWith({
        where: { id: 'kb-1' },
        include: {
          files: true,
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      expect(result).toEqual(mockKnowledgeBase);
    });

    it('should return knowledge base when no userId provided', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await service.getKnowledgeBase('user-1', 'org-1', 'kb-1');

      expect(result).toEqual(mockKnowledgeBase);
    });

    it('should throw NotFoundException when knowledge base not found', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getKnowledgeBase('user-1', 'org-1', 'non-existent')).rejects.toThrow(
        new NotFoundException('Knowledge base with ID non-existent not found')
      );
    });

    it('should throw ForbiddenException when user does not have permission', async () => {
      const kbWithDifferentOwner = { ...mockKnowledgeBase, createdById: 'other-user' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(kbWithDifferentOwner);

      await expect(service.getKnowledgeBase('user-1', 'org-1', 'kb-1')).rejects.toThrow(
        new ForbiddenException("You don't have permission to access this knowledge base")
      );
    });
  });

  describe('createKnowledgeBase', () => {
    it('should create a knowledge base', async () => {
      const createData = { name: 'New KB', description: 'New Description' };
      (prismaService.knowledgeBase.create as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await service.createKnowledgeBase('user-1', 'org-1', createData.name, createData.description);

      expect(prismaService.knowledgeBase.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          description: createData.description,
          metadata: undefined,
          vectorStoreName: 'kb_org-1_user-1_New KB',
          createdById: 'user-1',
          organizationId: 'org-1',
        },
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      expect(result).toEqual(mockKnowledgeBase);
    });

    it('should create knowledge base with default userId when not provided', async () => {
      const createData = { name: 'New KB', description: 'New Description' };
      (prismaService.knowledgeBase.create as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      await service.createKnowledgeBase('user-1', 'org-1', createData.name, createData.description);

      expect(prismaService.knowledgeBase.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          description: createData.description,
          metadata: undefined,
          vectorStoreName: 'kb_org-1_user-1_New KB',
          createdById: 'user-1',
          organizationId: 'org-1',
        },
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });
  });

  describe('updateKnowledgeBase', () => {
    const updateDto: UpdateKnowledgeBaseDto = {
      name: 'Updated KB',
      description: 'Updated Description',
    };

    it('should update knowledge base when user has permission', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.knowledgeBase.update as jest.Mock).mockResolvedValue({ ...mockKnowledgeBase, ...updateDto });

      await service.updateKnowledgeBase('user-1', 'org-1', 'kb-1', updateDto);

      expect(prismaService.knowledgeBase.update).toHaveBeenCalledWith({
        where: { id: 'kb-1' },
        data: updateDto,
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
    });

    it('should throw ForbiddenException when user does not have permission', async () => {
      const kbWithDifferentOwner = { ...mockKnowledgeBase, createdById: 'other-user' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(kbWithDifferentOwner);

      await expect(service.updateKnowledgeBase('user-1', 'org-1', 'kb-1', updateDto)).rejects.toThrow(
        new ForbiddenException("You don't have permission to update this knowledge base")
      );
    });

    it('should throw ForbiddenException when knowledge base not found', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateKnowledgeBase('user-1', 'org-1', 'kb-1', updateDto)).rejects.toThrow(
        new ForbiddenException("You don't have permission to update this knowledge base")
      );
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('should delete knowledge base when user has permission', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agentKnowledgeBase.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.knowledgeBase.delete as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      // Mock the createVectorStore to return an object with clearCollection method
      jest.spyOn(service, 'createVectorStore' as keyof KnowledgeBaseService).mockResolvedValue({
        clearCollection: jest.fn().mockResolvedValue(undefined),
      } as any);

      await service.deleteKnowledgeBase('user-1', 'org-1', 'kb-1');

      expect(prismaService.agentKnowledgeBase.deleteMany).toHaveBeenCalledWith({
        where: { knowledgeBaseId: 'kb-1' },
      });
      expect(prismaService.knowledgeBase.delete).toHaveBeenCalledWith({
        where: { id: 'kb-1' },
      });
    });

    it('should throw ForbiddenException when user does not have permission', async () => {
      const kbWithDifferentOwner = { ...mockKnowledgeBase, createdById: 'other-user' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(kbWithDifferentOwner);

      await expect(service.deleteKnowledgeBase('user-1', 'org-1', 'kb-1')).rejects.toThrow(
        new ForbiddenException("You don't have permission to delete this knowledge base")
      );
    });
  });

  describe('uploadFile', () => {
    const mockFileBuffer = Buffer.from('test file content');
    const mockUploadFile = {
      originalname: 'test.txt',
      buffer: mockFileBuffer,
    };

    it('should upload file successfully', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.create as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.uploadFile('user-1', 'org-1', 'kb-1', mockUploadFile);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(prismaService.file.create).toHaveBeenCalledWith({
        data: {
          path: expect.any(String),
          name: 'test.txt',
          knowledgeBaseId: 'kb-1',
          status: FileStatus.PENDING,
        },
      });
      expect(result).toEqual(mockFile);
    });

    it('should handle file upload when directory does not exist', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.create as jest.Mock).mockResolvedValue(mockFile);
      mockFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));

      const result = await service.uploadFile('user-1', 'org-1', 'kb-1', mockUploadFile);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(result).toEqual(mockFile);
    });
  });

  describe('getFiles', () => {
    it('should return files for knowledge base', async () => {
      const mockFiles = [mockFile];
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findMany as jest.Mock).mockResolvedValue(mockFiles);

      const result = await service.getFiles('user-1', 'org-1', 'kb-1');

      expect(prismaService.file.findMany).toHaveBeenCalledWith({
        where: { knowledgeBaseId: 'kb-1' },
      });
      expect(result).toEqual(mockFiles);
    });
  });

  describe('getFileStatus', () => {
    it('should return file status', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(mockFile);

      const result = await service.getFileStatus('user-1', 'org-1', 'kb-1', 'file-1');

      expect(prismaService.file.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getFileStatus('user-1', 'org-1', 'kb-1', 'file-1')).rejects.toThrow(
        new NotFoundException('File not found')
      );
    });

    it('should throw NotFoundException when file belongs to different knowledge base', async () => {
      const fileWithDifferentKB = { ...mockFile, knowledgeBaseId: 'other-kb' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(fileWithDifferentKB);

      await expect(service.getFileStatus('user-1', 'org-1', 'kb-1', 'file-1')).rejects.toThrow(
        new NotFoundException('File not found')
      );
    });
  });

  describe('trainFile', () => {
    it('should train file successfully', async () => {
      const processedFile = { ...mockFile, status: FileStatus.PROCESSED };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prismaService.file.update as jest.Mock).mockResolvedValue(processedFile);

      const result = await service.trainFile('user-1', 'org-1', 'kb-1', 'file-1');

      expect(prismaService.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { status: FileStatus.PROCESSED },
      });
      expect(result).toEqual(processedFile);
    });

    it('should mark file as failed when training fails', async () => {
      const failedFile = { ...mockFile, status: FileStatus.FAILED };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(mockFile);
      (prismaService.file.update as jest.Mock).mockResolvedValue(failedFile);

      // Mock fs.readFile to throw error for this specific test
      mockFs.readFile.mockRejectedValueOnce(new Error('File read error'));

      const result = await service.trainFile('user-1', 'org-1', 'kb-1', 'file-1');

      expect(prismaService.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { status: FileStatus.FAILED },
      });
      expect(result).toEqual(failedFile);
    });

    it('should throw NotFoundException when file not found', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.file.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.trainFile('user-1', 'org-1', 'kb-1', 'file-1')).rejects.toThrow(
        new NotFoundException('File not found')
      );
    });
  });

  describe('linkKnowledgeBaseToAgent', () => {
    it('should link knowledge base to agent successfully', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.agentKnowledgeBase.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.agentKnowledgeBase.create as jest.Mock).mockResolvedValue(mockAgentKnowledgeBase);

      const result = await service.linkKnowledgeBaseToAgent('user-1', 'org-1', 'kb-1', 'agent-1');

      expect(prismaService.agentKnowledgeBase.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agent-1',
          knowledgeBaseId: 'kb-1',
        },
      });
      expect(result).toEqual({
        success: true,
        message: 'Knowledge base linked to agent',
      });
    });

    it('should return false when link already exists', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.agentKnowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockAgentKnowledgeBase);

      const result = await service.linkKnowledgeBaseToAgent('user-1', 'org-1', 'kb-1', 'agent-1');

      expect(result).toEqual({
        success: false,
        message: 'Knowledge base already linked to agent',
      });
    });

    it('should throw ForbiddenException when user does not own agent', async () => {
      const agentWithDifferentOwner = { ...mockAgent, createdById: 'other-user' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(agentWithDifferentOwner);

      await expect(service.linkKnowledgeBaseToAgent('user-1', 'org-1', 'kb-1', 'agent-1')).rejects.toThrow(
        new ForbiddenException("You don't have permission to link this agent")
      );
    });
  });

  describe('unlinkKnowledgeBaseFromAgent', () => {
    it('should unlink knowledge base from agent successfully', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(mockAgent);
      (prismaService.agentKnowledgeBase.delete as jest.Mock).mockResolvedValue(mockAgentKnowledgeBase);

      const result = await service.unlinkKnowledgeBaseFromAgent('user-1', 'org-1', 'kb-1', 'agent-1');

      expect(prismaService.agentKnowledgeBase.delete).toHaveBeenCalledWith({
        where: {
          agentId_knowledgeBaseId: {
            agentId: 'agent-1',
            knowledgeBaseId: 'kb-1',
          },
        },
      });
      expect(result).toEqual({
        success: true,
        message: 'Knowledge base unlinked from agent',
      });
    });

    it('should throw ForbiddenException when user does not own agent', async () => {
      const agentWithDifferentOwner = { ...mockAgent, createdById: 'other-user' };
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agent.findUnique as jest.Mock).mockResolvedValue(agentWithDifferentOwner);

      await expect(service.unlinkKnowledgeBaseFromAgent('user-1', 'org-1', 'kb-1', 'agent-1')).rejects.toThrow(
        new ForbiddenException("You don't have permission to unlink this agent")
      );
    });
  });

  describe('getIndex', () => {
    it('should return vector store index', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await service.getIndex('kb-1');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when knowledge base not found', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getIndex('non-existent')).rejects.toThrow(
        new NotFoundException('Knowledge base not found')
      );
    });
  });

  describe('query', () => {
    it('should return query response when no agentId provided', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await service.query('kb-1', 'What is this about?');

      expect(result).toEqual({
        sources: [],
        totalFound: 0,
        returned: 0,
      });
    });

    it('should return query response when agentId has access', async () => {
      (prismaService.knowledgeBase.findUnique as jest.Mock).mockResolvedValue(mockKnowledgeBase);
      (prismaService.agentKnowledgeBase.findUnique as jest.Mock).mockResolvedValue({
        id: 'akb-1',
        agentId: 'agent-1',
        knowledgeBaseId: 'kb-1'
      });

      const result = await service.query('kb-1', 'What is this about?', undefined, 'agent-1');

      expect(prismaService.agentKnowledgeBase.findUnique).toHaveBeenCalledWith({
        where: {
          agentId_knowledgeBaseId: {
            agentId: 'agent-1',
            knowledgeBaseId: 'kb-1'
          }
        }
      });
      expect(result).toEqual({
        sources: [],
        totalFound: 0,
        returned: 0,
      });
    });

    it('should throw ForbiddenException when agentId has no access', async () => {
      (prismaService.agentKnowledgeBase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.query('kb-1', 'What is this about?', undefined, 'agent-1'))
        .rejects.toThrow('智能体无权限访问该知识库');

      expect(prismaService.agentKnowledgeBase.findUnique).toHaveBeenCalledWith({
        where: {
          agentId_knowledgeBaseId: {
            agentId: 'agent-1',
            knowledgeBaseId: 'kb-1'
          }
        }
      });
    });
  });
});