import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateJobLanguageDto {
  @IsNotEmpty()
  @IsInt()
  jobId: number;

  @IsNotEmpty()
  @IsInt()
  languageId: number;
}
