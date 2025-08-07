import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { FileStatus } from '@prisma/client';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateKnowledgeBaseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddKnowledgeBaseToAgentDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

export class RemoveKnowledgeBaseFromAgentDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

export class ChatWithKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

// Response DTOs
export class FileResponseDto {
  id: string;
  name: string;
  path: string;
  status: FileStatus;
  knowledgeBaseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FileUploadResponseDto {
  message: string;
  file: FileResponseDto;
}

export class FileTrainingResponseDto {
  message: string;
  status: FileStatus;
}

export class KnowledgeBaseResponseDto {
  id: string;
  name: string;
  description: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  files?: FileResponseDto[];
}

export class DeleteResponseDto {
  message: string;
}
