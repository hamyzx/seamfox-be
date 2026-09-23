import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateMysteryDto {
  @IsNotEmpty()
  @IsNumber()
  weekNo: number;

  @IsNotEmpty()
  @IsString()
  word: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNumber()
  timeLimit?: number; // in seconds

  @IsOptional()
  @IsNumber()
  maxPoint?: number;

  @IsOptional()
  createdBy?: string;
}
