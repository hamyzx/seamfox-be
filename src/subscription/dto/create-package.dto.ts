import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UserRoles } from '../../lib/enums/user.enum';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  monthlyPrice: number;

  @IsInt()
  quarterlyPrice: number;

  @IsInt()
  annualPrice: number;

  @IsOptional()
  @IsEnum(UserRoles)
  role: UserRoles;

  @IsOptional()
  @IsBoolean()
  isQuarterly: boolean = true;

  @IsOptional()
  @IsBoolean()
  isAnnually: boolean = true;

  @IsOptional()
  @IsBoolean()
  isMonthly: boolean = true;

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
