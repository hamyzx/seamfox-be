import { IsOptional, IsInt, IsString, IsObject, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { FaqType } from '../entities/faq.entity';

export class GetAllFaqDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 100;

  @IsOptional()
  @IsString()
  sortBy?: string = 'id';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FaqType)
  type?: FaqType;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}