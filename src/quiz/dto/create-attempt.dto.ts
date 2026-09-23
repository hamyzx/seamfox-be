import { IsUUID } from 'class-validator';

export class CreateAttemptDto {
  @IsUUID()
  userId: string;
}
