import { IsOptional, IsString, IsNumberString, IsObject, IsBooleanString } from 'class-validator';

export class GetAllCandidateDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  filters?: {
    country?: string;
    city?: string;
    currency?: string;
    minSalary?: string;
    maxSalary?: string;
    jobRole?: string;
    industry?: string;
    currentCompany?: string;
    premiumFirst?: string;
    nationality?: string;
    language?: string;
    noticePeriod?: string;
  };

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  premiumFirst?: string;
}