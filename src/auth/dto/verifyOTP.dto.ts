import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OTPType } from '../../lib/enums/otp.enum';

export class VerifyOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Min(1000)
  @Max(999999)
  @IsNumber({}, { message: 'Code must be number' })
  @IsNotEmpty()
  code: number;

  @IsString()
  @IsEnum(OTPType)
  @IsNotEmpty()
  type: OTPType;

  @IsString()
  @IsOptional()
  fcmToken?: string;
}
