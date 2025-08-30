import { IsString, IsOptional, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { MessageRole } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class AddMessageDto {
  @IsEnum(MessageRole)
  role: MessageRole;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  metadata?: any;
}

export class ConversationQueryDto {
  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsNumber()
  limit?: number = 6;
}