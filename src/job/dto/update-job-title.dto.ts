// update-job-title.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateJobTitleDto } from './create-job-title.dto';

export class UpdateJobTitleDto extends PartialType(CreateJobTitleDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
