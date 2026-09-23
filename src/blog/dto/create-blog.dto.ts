import {
  IsString, IsOptional, IsBoolean, IsEnum,
  IsNumber, IsDateString,
} from 'class-validator';
import { BlogStatus } from '../../lib/enums/blog-status.enum';

export class CreateBlogDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsString()
  shortDescription: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsString()
  authorId?: string; // Set automatically from req.user.id in controller

  @IsOptional()
  @IsDateString()
  publishAt?: Date;

  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  // ── Insights fields ────────────────────────────────────────────────────────
  @IsOptional()
  @IsBoolean()
  isEditorPick?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  readTime?: string;   // "12 min read"

  @IsOptional()
  @IsString()
  badgeLabel?: string; // "Deep Dive" | "Featured" | "Analysis" etc.

  // 🔥 NEW: Members Contributions section flag
  @IsOptional()
  @IsBoolean()
  isMembersContribution?: boolean;
}