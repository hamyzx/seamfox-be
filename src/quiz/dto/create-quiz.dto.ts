import { IsString, IsOptional, IsInt, IsUUID } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  timeLimit?: number; // seconds

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
