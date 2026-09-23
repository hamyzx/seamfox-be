import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class GetAllBlogDto {
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

  // Filtering (any field)
  @IsOptional()
  filters?: Record<string, any>;

  // Search
  @IsOptional()
  @IsString()
  search?: string;
}
