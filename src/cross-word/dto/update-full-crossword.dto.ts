import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFullCrosswordDto } from './create-full-crossword.dto';
import { UpdateClueDto } from './update-clue.dto';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsOptional, IsNumber } from 'class-validator';

export class UpdateClueDtoo extends UpdateClueDto {
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class UpdateFullCrosswordDto extends PartialType(
  OmitType(CreateFullCrosswordDto, ['clues'] as const),
) {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateClueDtoo)
  clues?: UpdateClueDtoo[];

  @IsOptional()
  updatedBy?: string;
}
