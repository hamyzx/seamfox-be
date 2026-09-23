import { IsString, IsInt, IsOptional, IsBoolean, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { AlternativeNumberType, CandidateStatus, Gender } from '../../lib/enums/candidate.enum';

export class CreateCandidateDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  alternativeNumber?: string;



  @IsOptional()
  @IsString()
  jobTitleName?: string;

  @IsOptional()
  @IsEnum(AlternativeNumberType)
  alternativeNumberType?: AlternativeNumberType;

  @IsOptional()
  @IsString()
  noticePeriod?: string;

  @IsOptional()
  @IsString()
  currentCompany?: string;

  
  @IsOptional()
  @IsInt()
  jobTitleId?: number;

  @IsInt()
  industryId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  yearOfExperience?: number;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isWrite?: boolean;

  @IsOptional()
  @IsBoolean()
  isSpoken?: boolean;

  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  minSalary?: number;

  @IsOptional()
  @IsInt()
  maxSalary?: number;
}