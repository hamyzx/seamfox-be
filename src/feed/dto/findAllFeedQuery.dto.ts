import { IsInt, Min, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '../../lib/enums/media-type.enum';
import { PaginationDTO } from '../../lib/dto/pagination.dto';

export class findAllFeedQueryDto extends PaginationDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 100;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;
}
