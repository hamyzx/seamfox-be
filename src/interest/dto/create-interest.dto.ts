import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInterestDto {
  @IsOptional()
  @IsInt()
  companyId: number;

  @IsOptional()
  @IsInt()
  candidateId: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
