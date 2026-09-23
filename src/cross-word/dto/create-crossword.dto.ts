import { IsNotEmpty, IsOptional, IsInt, IsUUID } from 'class-validator';

export class CreateCrosswordDto {
  @IsNotEmpty()
  title: string;

  @IsOptional()
  description?: string;

  @IsInt()
  maxPoint: number;

  @IsInt()
  timeLimit: number;

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
