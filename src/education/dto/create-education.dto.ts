import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';

export class CreateEducationDto {
  @IsInt()
  @IsOptional()
  candidateId: number;

  @IsString()
  instituationName: string;

  @IsString()
  degree: string;

  @IsString()
  major: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startDate: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;
}
