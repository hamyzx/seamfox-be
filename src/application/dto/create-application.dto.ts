import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  jobId: number;

  @IsOptional()
  @IsInt()
  candidateId: number;

  @IsOptional()
  @IsInt()
  resumeId?: number;
}
