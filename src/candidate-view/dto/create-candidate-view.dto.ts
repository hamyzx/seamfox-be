import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCandidateViewDto {
  @IsNotEmpty()
  @IsNumber()
  candidateId: number;

  // companyId will be injected from req.user
  companyId: number;
}
