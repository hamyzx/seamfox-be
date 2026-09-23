import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCandidateNationalityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  candidateId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nationalityId: number;
}
