import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import {
  EmploymentType,
  LocationType,
  SalaryType,
  JobStatus,
  JobLevel,
} from '../../lib/enums/job.enum';

export class CreateJobDto {
  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsEnum(['company', 'admin'])
  createdByType?: 'company' | 'admin';

  @IsOptional()
  @IsUUID()
  createdByAdminId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyLogo?: string;

  @IsOptional()
  @IsBoolean()
  hideCompanyName?: boolean;

  @IsInt()
  @IsNotEmpty()
  jobTitleId: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  responsibilities: string;

  @IsOptional()
  @IsBoolean()
  isConfidentialName?: boolean;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmploymentType)
  contractType?: EmploymentType;

  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  reportingTo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minExperience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxExperience?: number;

  @IsOptional()
  isTravelExpenseIncluded?: boolean;

  @IsOptional()
  @IsString()
  workMode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsString()
  additionalRequirements?: string;

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
  salary?: string;

  @IsEnum(SalaryType)
  salaryType: SalaryType;

  @IsString()
  salaryCurrency: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.OPENED;

  @IsOptional()
  kanbanBoardId?: number;

  @IsOptional()
  @IsUUID()
  createdBy: string;

  @IsOptional()
  @IsDateString()
  jobPostedDate?: string;

  @IsOptional()
  @IsDateString()
  jobExpiryDate?: string;

  @IsOptional()
  @IsInt()
  requiredEducationId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  requiredEducationIds?: number[];

  @IsOptional()
  @IsEnum(JobLevel)
  jobLevel: JobLevel = JobLevel.MID;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalPositions?: number = 1;
}