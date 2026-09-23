// src/company/dto/query-company.dto.ts
import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class GetAllCompanyDto {
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

  // Filtering (any field)
  @IsOptional()
  filters?: Record<string, any>;

  // Search
  @IsOptional()
  @IsString()
  search?: string;
}
