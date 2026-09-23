import { PartialType } from '@nestjs/mapped-types';
import { CreateFaqDto } from './create-faq.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
