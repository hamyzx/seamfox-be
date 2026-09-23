import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsNumber, IsBoolean } from 'class-validator';
import { UserRoles, UserStatus } from '../../lib/enums/user.enum';

const AllowedRoles = Object.values(UserRoles).filter((role) => role !== UserRoles.SUPER_ADMIN);
export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  bio: string;

  @IsOptional()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  profileImg?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus = UserStatus.ACTIVE;

  @IsEnum(AllowedRoles, {
    message: `Role must be one of: ${AllowedRoles.join(', ')}`,
  })
  role: UserRoles;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}
