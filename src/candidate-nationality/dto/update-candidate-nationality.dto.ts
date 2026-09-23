import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCandidateNationalityDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nationalityId: number;
}
