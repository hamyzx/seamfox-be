import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateClueDto {
  @IsNotEmpty()
  clue: string;

  @IsNotEmpty()
  answer: string;

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
