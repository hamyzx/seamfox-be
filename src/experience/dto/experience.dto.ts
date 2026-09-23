import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { EmploymentType, LocationType } from '../../lib/enums/experience.enum';

export class CreateExperienceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  jobTitle: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  companyName: string;

  @IsOptional()
  @IsBoolean()
  isCurrentRole?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  // If isCurrentRole is false/undefined, endDate is required
  @ValidateIf((o) => !o.isCurrentRole)
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExperienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  jobTitle?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @IsOptional()
  @IsBoolean()
  isCurrentRole?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  description?: string;
}