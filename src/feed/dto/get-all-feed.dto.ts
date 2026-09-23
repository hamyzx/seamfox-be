import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class GetAllFeedDto {
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
  filters?: Record<string, any>;

  @IsOptional()
  @IsString()
  search?: string;
}
