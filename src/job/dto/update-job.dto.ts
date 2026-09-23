// src/job/dto/update-job.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateJobDto } from './create-job.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { JobStatus } from '../../lib/enums/job.enum';

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
