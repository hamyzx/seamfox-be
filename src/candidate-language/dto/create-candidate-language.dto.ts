import { IsInt, IsBoolean, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCandidateLanguageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'candidateId must be an integer' })
  @Min(1, { message: 'candidateId must be greater than 0' })
  candidateId: number;

  @IsNotEmpty({ message: 'languageId is required' })
  @Type(() => Number)
  @IsInt({ message: 'languageId must be an integer' })
  @Min(1, { message: 'languageId must be greater than 0' })
  languageId: number;

  @IsOptional()
  @IsBoolean({ message: 'isRead must be a boolean value' })
  isRead: boolean = false;

  @IsOptional()
  @IsBoolean({ message: 'isWrite must be a boolean value' })
  isWrite: boolean = false;

  @IsOptional()
  @IsBoolean({ message: 'isSpoken must be a boolean value' })
  isSpoken: boolean = false;
}
