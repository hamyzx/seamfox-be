import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { passwordRegex } from '../../lib/regex';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsNotEmpty()
  @MinLength(8)
  @Matches(passwordRegex, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@#$%^&*!)',
  })
  password: string;
}