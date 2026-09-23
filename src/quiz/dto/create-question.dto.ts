import { IsString, IsNumber } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsNumber()
  points: number;
}
