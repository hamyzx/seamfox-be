import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { CreateUserDto } from './createUser.dto';
import { SocialTypes } from '../../lib/enums/user.enum';

export class CreateSocialLoginUserDTO extends CreateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsNotEmpty()
  @IsString()
  socialId: string;

  @IsNotEmpty()
  @IsEnum(SocialTypes)
  socialType: SocialTypes;

  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}