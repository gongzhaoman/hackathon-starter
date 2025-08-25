import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateScheduledTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  agentId: string;

  @IsString()
  @IsNotEmpty()
  triggerPrompt: string;

  @IsString()
  @IsNotEmpty()
  cronExpression: string;

  @IsOptional()
  @IsString()
  timezone?: string = 'Asia/Shanghai';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}

export class UpdateScheduledTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  triggerPrompt?: string;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ScheduledTaskQueryDto {
  @IsOptional()
  @IsString()
  agentId?: string;
}