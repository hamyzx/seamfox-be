import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid User ID format' })
  createdBy?: string;
}