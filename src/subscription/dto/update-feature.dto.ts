import { PartialType } from '@nestjs/mapped-types';
import { CreateFeatureDto } from './create-feature.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
