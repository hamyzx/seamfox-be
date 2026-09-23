import { IsBoolean, IsUUID } from 'class-validator';

export class RecordAnswerDto {
  @IsBoolean()
  isCorrect: boolean;
}
