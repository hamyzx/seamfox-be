import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsUUID,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PostVisibility } from '../../lib/enums/post-visibility.enum';
import { MediaType } from '../../lib/enums/media-type.enum';
import { CreatePollDto } from './createPoll.dto';

export class CreatePostMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  mediaUrl: string;

  @IsEnum(MediaType)
  mediaType: MediaType;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  // 🔥 CHANGED: description is now optional when sharing an article
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  location?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility = PostVisibility.PUBLIC;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreatePostMediaDto)
  media?: CreatePostMediaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((t: string) => t.trim().toLowerCase().replace(/^#/, ''))
      : value,
  )
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePollDto)
  poll?: CreatePollDto;

  // REPOST
  @IsOptional()
  @IsUUID()
  sharedPostId?: string;

  // 🔥 NEW: ARTICLE SHARE
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value !== undefined && value !== null ? parseInt(value, 10) : value))
  sharedBlogId?: number;
}