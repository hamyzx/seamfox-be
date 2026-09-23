// import { PartialType } from '@nestjs/mapped-types';
// import { CreateFullQuizDto } from './create-complete-quiz.dto';
// import { IsOptional, IsUUID } from 'class-validator';

// export class UpdateFullQuizDto extends PartialType(CreateFullQuizDto) {
//   @IsOptional()
//   @IsUUID()
//   updatedBy?: string;
// }

import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFullQuizOptionDto {
  @IsOptional()
  @IsInt()
  id?: number; // existing option ID

  @IsString()
  option: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class UpdateFullQuizQuestionDto {
  @IsOptional()
  @IsInt()
  id?: number; // existing question ID

  @IsString()
  question: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFullQuizOptionDto)
  options: UpdateFullQuizOptionDto[];
}

export class UpdateFullQuizDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  timeLimit?: number;

  @IsOptional()
  @IsUUID()
  updatedBy: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFullQuizQuestionDto)
  questions: UpdateFullQuizQuestionDto[];
}
