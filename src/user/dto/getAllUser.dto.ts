import { PaginationDTO } from '../../lib/dto/pagination.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../../lib/enums/user.enum';
export class GetAllUserDTO extends PaginationDTO {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  type?: 'PREMIUM' | 'FREE';

  @IsOptional()
  @IsString()
  location?: string;
}
