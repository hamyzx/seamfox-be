import { IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';

export class RecordAnswerDto {
  @IsNotEmpty()
  @IsNumber()
  optionId: number;
}
