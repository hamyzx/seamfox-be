import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateCrosswordDto } from './create-crossword.dto';

export class UpdateCrosswordDto extends PartialType(CreateCrosswordDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
