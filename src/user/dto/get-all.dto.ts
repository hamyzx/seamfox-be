import { IsOptional, IsString, IsNumberString, IsIn } from 'class-validator';

export class GetAllDto {
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
  @IsNumberString()
  companyId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['title', 'company'])
  searchType?: 'title' | 'company';

  @IsOptional()
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  search?: string;
}