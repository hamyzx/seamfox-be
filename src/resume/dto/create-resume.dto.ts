import { IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateResumeDto {
  @IsInt()
  @IsOptional()
  candidateId: number;

  @IsString()
  filePath: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
