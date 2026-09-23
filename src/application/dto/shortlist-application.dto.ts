import { IsNotEmpty, IsNumber } from 'class-validator';

export class ShortlistApplicationDto {
  @IsNumber()
  @IsNotEmpty()
  candidateId: number;

  @IsNumber()
  @IsNotEmpty()
  jobId: number;
}