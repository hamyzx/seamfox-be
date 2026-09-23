import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateSkillDto {
  @IsInt()
  @IsOptional()
  candidateId: number;

  @IsInt()
  skillId: number;

  @IsInt()
  @Min(1, { message: 'Proficiency level must be at least 1' })
  @Max(5, { message: 'Proficiency level must not exceed 5' })
  proficiencyLevel: number;

  @IsInt()
  yearsOfExperience: number;
}
