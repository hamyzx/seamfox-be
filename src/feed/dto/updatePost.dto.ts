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
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PostVisibility, PostStatus } from '../../lib/enums/post-visibility.enum';
import { MediaType } from '../../lib/enums/media-type.enum';

export class UpdatePostMediaDto {
  @IsOptional()
  @IsString({ message: 'Media path/URL must be text.' })
  @MaxLength(1024, { message: 'Media path/URL can be at most $constraint1 characters.' })
  mediaUrl?: string;

  @IsOptional()
  @IsEnum(MediaType, {
    message: 'Media type must be one of the supported types (e.g., IMAGE, VIDEO).',
  })
  mediaType?: MediaType;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString({ message: 'Title must be text.' })
  @MaxLength(120, { message: 'Title can be at most $constraint1 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be text.' })
  @IsNotEmpty({ message: 'Please add a description.' })
  @MaxLength(4000, { message: 'Description can be at most $constraint1 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsString({ message: 'Address must be text.' })
  @IsNotEmpty({ message: 'Please provide an address.' })
  @MaxLength(255, { message: 'Address can be at most $constraint1 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  location?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : parseFloat(value)))
  @IsNumber({}, { message: 'Latitude must be a number.' })
  @Min(-90, { message: 'Latitude cannot be less than -90.' })
  @Max(90, { message: 'Latitude cannot be greater than 90.' })
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? value : parseFloat(value)))
  @IsNumber({}, { message: 'Longitude must be a number.' })
  @Min(-180, { message: 'Longitude cannot be less than -180.' })
  @Max(180, { message: 'Longitude cannot be greater than 180.' })
  longitude?: number;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(PostVisibility, {
    message: 'Visibility must be one of: Public, Followers, or Only Me.',
  })
  visibility?: PostVisibility;

  @IsOptional()
  @IsArray({ message: 'Media must be a list.' })
  @ArrayMaxSize(10, { message: 'You can attach up to $constraint1 media items.' })
  @ValidateNested({ each: true })
  @Type(() => UpdatePostMediaDto)
  media?: UpdatePostMediaDto[];

  // 🔥 NEW: tags can be edited
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
}