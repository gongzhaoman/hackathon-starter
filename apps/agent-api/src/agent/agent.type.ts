import { IsString, IsOptional, IsNotEmpty, IsObject, IsArray } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsObject()
  @IsOptional()
  options?: object;

  @IsArray()
  @IsOptional()
  toolkitIds?: string[];
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsObject()
  @IsOptional()
  options?: any;
}

export class ChatWithAgentDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  context?: any;
}
