import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFullMysteryDto } from './create-full-mystery.dto';
import { UpdateOptionDto } from './update-option.dto';
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

// export class UpdateOptionDtoo extends PartialType(CreateFullMysteryDto['prototype']['options'][0].constructor) {
//   @IsOptional()
//   @IsNumber()
//   id?: number;
// }

export class UpdateOptionDtoo {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  meaning?: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class UpdateFullMysteryDto extends PartialType(
  OmitType(CreateFullMysteryDto, ['options'] as const),
) {
  @IsOptional()
  options?: UpdateOptionDtoo[];

  @IsOptional()
  updatedBy?: string;
}
