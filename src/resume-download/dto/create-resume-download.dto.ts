import { IsInt } from 'class-validator';

export class CreateResumeDownloadDto {
  @IsInt()
  companyId: number;

  @IsInt()
  resumeId: number;
}
