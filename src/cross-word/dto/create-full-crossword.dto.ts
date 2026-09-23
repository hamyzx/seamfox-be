import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  ValidateNested,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClueDto } from './create-clue.dto';

export class CreateFullCrosswordClueDto extends CreateClueDto {}

export class CreateFullCrosswordDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  maxPoint: number;

  @IsInt()
  timeLimit: number;

  @IsOptional()
  @IsUUID()
  createdBy: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFullCrosswordClueDto)
  clues: CreateFullCrosswordClueDto[];
}
