import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateCertificationDto {
  @IsOptional()
  @IsInt()
  candidateId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsDateString()
  issueDate: Date;

  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  filePath?: string;
}
