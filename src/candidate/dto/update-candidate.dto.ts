import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCandidateDto } from './create-candidate.dto';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCandidateDto extends PartialType(
  OmitType(CreateCandidateDto, ['userId'] as const),
) {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isEmailConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isPhoneConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isAddressConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isCvConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isLinkedinConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrentSalaryConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isExpectedSalaryConfidential?: boolean;

  @IsOptional()
  @IsUUID()
  adminId?: string;
}
