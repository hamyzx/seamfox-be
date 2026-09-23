// create-full-quiz.dto.ts
import { IsString, IsOptional, IsInt, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';
import { CreateOptionDto } from './create-option.dto';

export class CreateFullQuizOptionDto extends CreateOptionDto {}

export class CreateFullQuizQuestionDto extends CreateQuestionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFullQuizOptionDto)
  options: CreateFullQuizOptionDto[];
}

export class CreateFullQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  timeLimit?: number;

  @IsOptional()
  @IsUUID()
  createdBy: string;

  @IsOptional()
  @IsUUID()
  updatedBy: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFullQuizQuestionDto)
  questions: CreateFullQuizQuestionDto[];
}
