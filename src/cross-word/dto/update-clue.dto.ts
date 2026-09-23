import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateClueDto } from './create-clue.dto';

export class UpdateClueDto extends PartialType(CreateClueDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
