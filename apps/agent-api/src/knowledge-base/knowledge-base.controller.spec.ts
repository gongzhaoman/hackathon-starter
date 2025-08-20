import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';

describe('KnowledgeBaseController', () => {
  let controller: KnowledgeBaseController;
  let knowledgeBaseService: KnowledgeBaseService;

  beforeEach(async () => {
    const mockKnowledgeBaseService = {
      getAllKnowledgeBases: jest.fn(),
      getKnowledgeBase: jest.fn(),
      createKnowledgeBase: jest.fn(),
      updateKnowledgeBase: jest.fn(),
      deleteKnowledgeBase: jest.fn(),
      uploadFile: jest.fn(),
      getFiles: jest.fn(),
      getFileStatus: jest.fn(),
      trainFile: jest.fn(),
      linkKnowledgeBaseToAgent: jest.fn(),
      unlinkKnowledgeBaseFromAgent: jest.fn(),
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeBaseController],
      providers: [
        {
          provide: KnowledgeBaseService,
          useValue: mockKnowledgeBaseService,
        },
      ],
    }).compile();

    controller = module.get<KnowledgeBaseController>(KnowledgeBaseController);
    knowledgeBaseService = module.get<KnowledgeBaseService>(KnowledgeBaseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllKnowledgeBases', () => {
    it('should return all knowledge bases', async () => {
      const mockKnowledgeBases = [
        {
          id: 'kb-1',
          name: 'Test Knowledge Base',
          description: 'Test Description',
          vectorStoreName: 'kb_user1_test',
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          files: [],
        },
      ];

      (knowledgeBaseService.getAllKnowledgeBases as jest.Mock).mockResolvedValue(mockKnowledgeBases);

      const result = await controller.getAllKnowledgeBases('user-1');

      expect(knowledgeBaseService.getAllKnowledgeBases).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockKnowledgeBases);
    });

    it('should return all knowledge bases when no userId provided', async () => {
      const mockKnowledgeBases = [
        {
          id: 'kb-1',
          name: 'Test Knowledge Base',
          description: 'Test Description',
        },
      ];

      (knowledgeBaseService.getAllKnowledgeBases as jest.Mock).mockResolvedValue(mockKnowledgeBases);

      const result = await controller.getAllKnowledgeBases();

      expect(knowledgeBaseService.getAllKnowledgeBases).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockKnowledgeBases);
    });
  });

  describe('getKnowledgeBase', () => {
    it('should return a knowledge base by id', async () => {
      const mockKnowledgeBase = {
        id: 'kb-1',
        name: 'Test Knowledge Base',
        description: 'Test Description',
        vectorStoreName: 'kb_user1_test',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        files: [],
      };

      (knowledgeBaseService.getKnowledgeBase as jest.Mock).mockResolvedValue(mockKnowledgeBase);

      const result = await controller.getKnowledgeBase('kb-1', 'user-1');

      expect(knowledgeBaseService.getKnowledgeBase).toHaveBeenCalledWith('user-1', 'kb-1');
      expect(result).toEqual(mockKnowledgeBase);
    });

    it('should throw NotFoundException when knowledge base not found', async () => {
      (knowledgeBaseService.getKnowledgeBase as jest.Mock).mockRejectedValue(
        new NotFoundException('Knowledge base not found')
      );

      await expect(controller.getKnowledgeBase('non-existent', 'user-1')).rejects.toThrow(
        new NotFoundException('Knowledge base not found')
      );
    });
  });

  describe('createKnowledgeBase', () => {
    it('should create a new knowledge base', async () => {
      const createDto = {
        name: 'New Knowledge Base',
        description: 'New Description',
      };

      const mockCreatedKnowledgeBase = {
        id: 'kb-new',
        ...createDto,
        vectorStoreName: 'kb_user1_new',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        files: []
      };

      (knowledgeBaseService.createKnowledgeBase as jest.Mock).mockResolvedValue(mockCreatedKnowledgeBase);

      const result = await controller.createKnowledgeBase(createDto, 'user-1');

      expect(knowledgeBaseService.createKnowledgeBase).toHaveBeenCalledWith('user-1', createDto.name, createDto.description);
      expect(result).toEqual(mockCreatedKnowledgeBase);
    });
  });

  describe('updateKnowledgeBase', () => {
    it('should update a knowledge base', async () => {
      const updateDto = {
        name: 'Updated Knowledge Base',
        description: 'Updated Description',
      };

      const mockUpdatedKnowledgeBase = {
        id: 'kb-1',
        name: 'Updated Knowledge Base',
        description: 'Updated Description',
        vectorStoreName: 'kb_user1_test',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        files: []
      };

      (knowledgeBaseService.updateKnowledgeBase as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.updateKnowledgeBase('kb-1', updateDto, 'user-1');

      expect(knowledgeBaseService.updateKnowledgeBase).toHaveBeenCalledWith('user-1', 'kb-1', updateDto);
      expect(result).toEqual({ message: 'Knowledge base updated successfully' });
    });

    it('should throw ForbiddenException when user does not have permission', async () => {
      const updateDto = {
        name: 'Updated Knowledge Base',
      };

      (knowledgeBaseService.updateKnowledgeBase as jest.Mock).mockRejectedValue(
        new ForbiddenException('You do not have permission to update this knowledge base')
      );

      await expect(controller.updateKnowledgeBase('kb-1', updateDto, 'other-user')).rejects.toThrow(
        new ForbiddenException('You do not have permission to update this knowledge base')
      );
    });
  });

  describe('deleteKnowledgeBase', () => {
    it('should delete a knowledge base', async () => {
      const mockDeletedKnowledgeBase = {
        id: 'kb-1',
        name: 'Test Knowledge Base',
        deleted: true,
      };

      (knowledgeBaseService.deleteKnowledgeBase as jest.Mock).mockResolvedValue(undefined);

      const result = await controller.deleteKnowledgeBase('kb-1', 'user-1');

      expect(knowledgeBaseService.deleteKnowledgeBase).toHaveBeenCalledWith('user-1', 'kb-1');
      expect(result).toEqual({ message: 'Knowledge base deleted successfully' });
    });

    it('should throw ForbiddenException when user does not have permission', async () => {
      (knowledgeBaseService.deleteKnowledgeBase as jest.Mock).mockRejectedValue(
        new ForbiddenException('You do not have permission to delete this knowledge base')
      );

      await expect(controller.deleteKnowledgeBase('kb-1', 'other-user')).rejects.toThrow(
        new ForbiddenException('You do not have permission to delete this knowledge base')
      );
    });
  });

  describe('uploadFile', () => {
    it('should upload a file to knowledge base', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test content'),
      };

      const mockUploadResult = {
        id: 'file-1',
        name: 'test.pdf',
        path: '/uploads/uuid/test.pdf',
        status: 'PENDING',
        knowledgeBaseId: 'kb-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (knowledgeBaseService.uploadFile as jest.Mock).mockResolvedValue(mockUploadResult);

      const result = await controller.uploadFile('kb-1', mockFile, 'user-1');

      expect(knowledgeBaseService.uploadFile).toHaveBeenCalledWith('user-1', 'kb-1', mockFile);
      expect(result).toEqual({
        message: 'File uploaded successfully',
        file: mockUploadResult,
      });
    });
  });

  describe('getFiles', () => {
    it('should return files for a knowledge base', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          name: 'test.pdf',
          path: '/uploads/uuid/test.pdf',
          status: 'COMPLETED',
          knowledgeBaseId: 'kb-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (knowledgeBaseService.getFiles as jest.Mock).mockResolvedValue(mockFiles);

      const result = await controller.getFiles('kb-1', 'user-1');

      expect(knowledgeBaseService.getFiles).toHaveBeenCalledWith('user-1', 'kb-1');
      expect(result).toEqual(mockFiles);
    });
  });

  describe('getFileStatus', () => {
    it('should return file status', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.pdf',
        status: 'COMPLETED',
        knowledgeBaseId: 'kb-1',
      };

      (knowledgeBaseService.getFileStatus as jest.Mock).mockResolvedValue(mockFile);

      const result = await controller.getFileStatus('kb-1', 'file-1', 'user-1');

      expect(knowledgeBaseService.getFileStatus).toHaveBeenCalledWith('user-1', 'kb-1', 'file-1');
      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException when file not found', async () => {
      (knowledgeBaseService.getFileStatus as jest.Mock).mockRejectedValue(
        new NotFoundException('File not found')
      );

      await expect(controller.getFileStatus('kb-1', 'non-existent', 'user-1')).rejects.toThrow(
        new NotFoundException('File not found')
      );
    });
  });

  describe('trainFile', () => {
    it('should train a file', async () => {
      const mockTrainResult = {
        id: 'file-1',
        name: 'test.pdf',
        status: 'COMPLETED',
        knowledgeBaseId: 'kb-1',
      };

      (knowledgeBaseService.trainFile as jest.Mock).mockResolvedValue(mockTrainResult);

      const result = await controller.trainFile('kb-1', 'file-1', 'user-1');

      expect(knowledgeBaseService.trainFile).toHaveBeenCalledWith('user-1', 'kb-1', 'file-1');
      expect(result).toEqual({
        message: 'File training completed',
        status: mockTrainResult.status,
      });
    });
  });

  describe('linkKnowledgeBaseToAgent', () => {
    it('should link knowledge base to agent', async () => {
      const linkResult = {
        success: true,
        message: 'Knowledge base linked to agent',
      };
      (knowledgeBaseService.linkKnowledgeBaseToAgent as jest.Mock).mockResolvedValue(linkResult);

      const result = await controller.linkToAgent('kb-1', { agentId: 'agent-1' }, 'user-1');

      expect(knowledgeBaseService.linkKnowledgeBaseToAgent).toHaveBeenCalledWith('user-1', 'kb-1', 'agent-1');
      expect(result).toEqual(linkResult);
    });

    it('should return false when link already exists', async () => {
      const linkResult = {
        success: false,
        message: 'Knowledge base already linked to agent',
      };
      (knowledgeBaseService.linkKnowledgeBaseToAgent as jest.Mock).mockResolvedValue(linkResult);

      const result = await controller.linkToAgent('kb-1', { agentId: 'agent-1' }, 'user-1');

      expect(result).toEqual(linkResult);
    });
  });

  describe('unlinkKnowledgeBaseFromAgent', () => {
    it('should unlink knowledge base from agent', async () => {
      const unlinkResult = {
        success: true,
        message: 'Knowledge base unlinked from agent',
      };
      (knowledgeBaseService.unlinkKnowledgeBaseFromAgent as jest.Mock).mockResolvedValue(unlinkResult);

      const result = await controller.unlinkFromAgent('kb-1', { agentId: 'agent-1' }, 'user-1');

      expect(knowledgeBaseService.unlinkKnowledgeBaseFromAgent).toHaveBeenCalledWith('user-1', 'kb-1', 'agent-1');
      expect(result).toEqual(unlinkResult);
    });
  });

  describe('chat', () => {
    it('should return chat response from knowledge base', async () => {
      const chatDto = {
        message: 'What is this document about?',
      };

      const mockChatResponse = {
        response: 'This document is about testing frameworks.',
        sources: [
          {
            id: 'file-1',
            name: 'test.pdf',
            content: 'Relevant content excerpt...'
          }
        ]
      };

      (knowledgeBaseService.chat as jest.Mock).mockResolvedValue(mockChatResponse);

      const result = await controller.chat('kb-1', chatDto);

      expect(knowledgeBaseService.chat).toHaveBeenCalledWith('kb-1', chatDto.message);
      expect(result).toEqual(mockChatResponse);
    });

    it('should throw NotFoundException when knowledge base not found', async () => {
      const chatDto = {
        message: 'What is this document about?',
      };

      (knowledgeBaseService.chat as jest.Mock).mockRejectedValue(
        new NotFoundException('Knowledge base not found')
      );

      await expect(controller.chat('non-existent', chatDto)).rejects.toThrow(
        new NotFoundException('Knowledge base not found')
      );
    });
  });
});