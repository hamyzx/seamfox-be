import { PartialType } from '@nestjs/mapped-types';
import { CreateOptionDto } from './create-option.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateOptionDto extends PartialType(CreateOptionDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
