import { IsNotEmpty, IsEnum, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { OTPType } from '../../lib/enums/otp.enum';
export class CreateOtpDto {
  @IsNumber()
  @Min(1000)
  @Max(9999)
  @IsNotEmpty()
  code: number;

  @IsEnum(OTPType)
  @IsNotEmpty()
  type: OTPType;

  @IsUUID()
  @IsNotEmpty()
  createdBy: string;
}
