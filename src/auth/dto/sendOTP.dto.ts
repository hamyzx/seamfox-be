import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OTPType } from '../../lib/enums/otp.enum';

export class SendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(OTPType)
  @IsNotEmpty()
  type: OTPType;
}
