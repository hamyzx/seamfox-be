import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateMysteryDto } from './create-mystery.dto';
import { CreateOptionDto } from './create-option.dto';

export class CreateFullMysteryDto extends CreateMysteryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
