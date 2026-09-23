import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOptionDto {
  @IsNotEmpty()
  @IsString()
  meaning: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean = false;

  @IsOptional()
  createdBy?: string;
}
