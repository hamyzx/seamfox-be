import { IsInt, IsOptional, IsUUID, IsString } from 'class-validator';

export class CreateFeatureDto {
  @IsInt()
  packageId: number;

  @IsInt()
  featureId: number;

  @IsOptional()
  @IsString()
  limit: string;

  @IsOptional()
  @IsUUID()
  createdBy: string;
}
