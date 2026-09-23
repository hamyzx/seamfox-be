import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { CompanyStatus } from '../../lib/enums/company.enum';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsEmail()
  email: string;

  @IsString()
  countryCode: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsNumber()
  noOfEmployees?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  otherLocation?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  industryId?: string;

  @IsOptional()
  representativeName?: string;

  @IsOptional()
  @IsEmail()
  representativeEmail?: string;

  @IsOptional()
  representativePhoneNumber?: string;

  @IsOptional()
  website?: string;

  @IsOptional()
  linkedin?: string;

  @IsOptional()
  @IsString()
  landline?: string;

  @IsOptional()
  @IsBoolean()
  isLandlineConfidential?: boolean;

  @IsOptional()
  logo?: string;

  @IsOptional()
  foundedYear?: Date;

  @IsOptional()
  description?: string;

  @IsOptional()
  authorizedPerson?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
