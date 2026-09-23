import { IsNumber } from 'class-validator';

export class RecordAnswerDto {
  @IsNumber()
  optionId: number;
}
