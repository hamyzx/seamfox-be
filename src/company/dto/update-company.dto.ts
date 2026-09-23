import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyStatus } from '../../lib/enums/company.enum';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  adminId?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  industryId?: string;

   @IsOptional()
  @IsBoolean()
  isEmailConfidential?: boolean;
 
  
  @IsOptional()
  @IsBoolean()
  isPhoneConfidential?: boolean;
 
  @IsOptional()
  @IsBoolean()
  isLandlineConfidential?: boolean;
 
  @IsOptional()
  @IsBoolean()
  isRepNameConfidential?: boolean;
 
  @IsOptional()
  @IsBoolean()
  isRepEmailConfidential?: boolean;
 
  @IsOptional()
  @IsBoolean()
  isRepPhoneConfidential?: boolean;
}
