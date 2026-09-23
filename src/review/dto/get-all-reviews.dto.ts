import { IsOptional, IsString, IsNumberString, IsEnum } from 'class-validator';
import { UserRoles } from '../../lib/enums/user.enum';

export class GetAllReviewsDto {
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

  @IsOptional()
  @IsEnum(UserRoles)
  role: UserRoles;
}
