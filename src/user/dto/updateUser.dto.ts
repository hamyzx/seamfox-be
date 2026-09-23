import {
  IsOptional,
  IsString,
  MaxLength,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsEnum,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { UserStatus } from '../../lib/enums/user.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  profileImg?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentLocation?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  comment?: string;

  @IsOptional()
  @IsUUID()
  updatedBy?: string;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string | null;

  @IsOptional()
  @IsString()
  stripeAccountId?: string | null;
}
