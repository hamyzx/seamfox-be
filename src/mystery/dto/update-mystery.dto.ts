import { PartialType } from '@nestjs/mapped-types';
import { CreateMysteryDto } from './create-mystery.dto';

export class UpdateMysteryDto extends PartialType(CreateMysteryDto) {
  updatedBy?: string;
}
