import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateKanbanColumnDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}