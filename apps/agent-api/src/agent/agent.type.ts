import { IsString, IsOptional, IsNotEmpty, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ToolkitConfigDto {
  @IsString()
  @IsNotEmpty()
  toolkitId: string;

  @IsObject()
  @IsOptional()
  settings?: any;
}

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
  @ValidateNested({ each: true })
  @Type(() => ToolkitConfigDto)
  toolkits?: ToolkitConfigDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  knowledgeBases?: string[];
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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ToolkitConfigDto)
  toolkits?: ToolkitConfigDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  knowledgeBases?: string[];
}

export class ChatWithAgentDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsObject()
  @IsOptional()
  context?: any;
}
