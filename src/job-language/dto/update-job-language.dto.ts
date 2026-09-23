import { IsNumber } from 'class-validator';

export class UpdateJobLanguageDto {
  @IsNumber()
  jobId: number;

  @IsNumber()
  languageId: number;
}
