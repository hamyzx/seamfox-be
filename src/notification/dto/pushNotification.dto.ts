import { IsNotEmpty, IsString } from 'class-validator';

export class PushNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}
