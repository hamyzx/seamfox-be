import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class IntegarIdDTO {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  id: number;
}
