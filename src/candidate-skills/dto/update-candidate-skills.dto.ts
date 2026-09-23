import { IsInt, IsOptional, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCandidateSkillDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  skillId?: number;

  @IsOptional()
  @IsString()
  proficiencyLevel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;
}
