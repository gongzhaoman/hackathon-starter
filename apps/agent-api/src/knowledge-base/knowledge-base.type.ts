import { IsString, IsOptional, IsNotEmpty, IsObject } from 'class-validator';
import { FileStatus } from '@prisma/client';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadataSchema?: TypedMetadataSchema;
}

export class UpdateKnowledgeBaseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadataSchema?: TypedMetadataSchema;
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

export class QueryWithMetadataDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsObject()
  @IsOptional()
  metadataFilters?: MetadataFilterRequest;
}

// 元数据字段类型
export type MetadataFieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'enum';

// 支持的过滤操作符
export type FilterOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'nin' | 'text_match';

// 逻辑条件
export type LogicalCondition = 'AND' | 'OR';

// 元数据字段定义
export interface MetadataFieldDefinition {
  type: MetadataFieldType;
  description: string;
  example: any;
  supportedOperators: FilterOperator[];
  values?: any[]; // 用于enum类型
}

// 类型化元数据Schema
export interface TypedMetadataSchema {
  [fieldName: string]: MetadataFieldDefinition;
}

// 单个过滤条件
export interface MetadataFilterCondition {
  key: string;
  value: any;
  operator: FilterOperator;
}

// 复杂过滤请求
export interface MetadataFilterRequest {
  filters: MetadataFilterCondition[];
  condition?: LogicalCondition; // 默认为 AND
}

// 过滤示例
export interface FilterExample {
  description: string;
  filter: MetadataFilterRequest;
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
  metadataSchema?: TypedMetadataSchema;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  files?: FileResponseDto[];
}

// 增强的知识库响应，包含过滤示例
export interface EnhancedKnowledgeBaseResponse {
  id: string;
  name: string;
  description: string;
  metadataSchema: TypedMetadataSchema;
  filterExamples: FilterExample[];
  availableOperators: FilterOperator[];
  createdAt: Date;
  updatedAt: Date;
}

export class DeleteResponseDto {
  message: string;
}

// 工具函数：根据字段类型获取支持的操作符
export function getSupportedOperators(fieldType: MetadataFieldType): FilterOperator[] {
  switch (fieldType) {
    case 'string':
      return ['==', '!=', 'in', 'nin', 'text_match'];
    case 'number':
    case 'date':
      return ['==', '!=', '>', '<', '>=', '<=', 'in', 'nin'];
    case 'boolean':
      return ['==', '!='];
    case 'array':
      return ['in', 'nin'];
    case 'enum':
      return ['==', '!=', 'in', 'nin'];
    default:
      return ['==', '!='];
  }
}

// 工具函数：生成过滤示例
export function generateFilterExamples(schema: TypedMetadataSchema): FilterExample[] {
  const examples: FilterExample[] = [];
  const fields = Object.keys(schema);

  if (fields.length === 0) {
    return examples;
  }

  // 简单过滤示例
  const firstField = fields[0];
  const firstFieldDef = schema[firstField];
  examples.push({
    description: `按${firstFieldDef.description}筛选`,
    filter: {
      filters: [{
        key: firstField,
        value: firstFieldDef.example,
        operator: firstFieldDef.supportedOperators[0]
      }]
    }
  });

  // 如果有数字或日期字段，添加范围过滤示例
  const numericField = fields.find(f => ['number', 'date'].includes(schema[f].type));
  if (numericField) {
    const fieldDef = schema[numericField];
    examples.push({
      description: `${fieldDef.description}范围筛选`,
      filter: {
        filters: [
          {
            key: numericField,
            value: fieldDef.example,
            operator: '>='
          },
          {
            key: numericField,
            value: fieldDef.type === 'number' ? (fieldDef.example + 5) : '2024-12-31',
            operator: '<='
          }
        ],
        condition: 'AND'
      }
    });
  }

  // 如果有多个字段，添加复合过滤示例
  if (fields.length >= 2) {
    const secondField = fields[1];
    const secondFieldDef = schema[secondField];
    examples.push({
      description: `复合条件筛选`,
      filter: {
        filters: [
          {
            key: firstField,
            value: firstFieldDef.example,
            operator: firstFieldDef.supportedOperators[0]
          },
          {
            key: secondField,
            value: secondFieldDef.example,
            operator: secondFieldDef.supportedOperators[0]
          }
        ],
        condition: 'AND'
      }
    });
  }

  // 如果有数组或enum字段，添加包含示例
  const arrayField = fields.find(f => ['array', 'enum'].includes(schema[f].type));
  if (arrayField) {
    const fieldDef = schema[arrayField];
    examples.push({
      description: `${fieldDef.description}包含筛选`,
      filter: {
        filters: [{
          key: arrayField,
          value: fieldDef.type === 'array' ? fieldDef.example : [fieldDef.example],
          operator: 'in'
        }]
      }
    });
  }

  return examples;
}

// 工具函数：验证过滤条件
export function validateFilterCondition(
  condition: MetadataFilterCondition,
  schema: TypedMetadataSchema
): { valid: boolean; error?: string } {
  const fieldDef = schema[condition.key];
  
  if (!fieldDef) {
    return { valid: false, error: `未知的元数据字段: ${condition.key}` };
  }

  if (!fieldDef.supportedOperators.includes(condition.operator)) {
    return { 
      valid: false, 
      error: `字段 ${condition.key} 不支持操作符 ${condition.operator}，支持的操作符: ${fieldDef.supportedOperators.join(', ')}` 
    };
  }

  // 类型检查
  if (fieldDef.type === 'enum' && fieldDef.values && !['in', 'nin'].includes(condition.operator)) {
    if (!fieldDef.values.includes(condition.value)) {
      return {
        valid: false,
        error: `字段 ${condition.key} 的值必须是以下之一: ${fieldDef.values.join(', ')}`
      };
    }
  }

  return { valid: true };
}
