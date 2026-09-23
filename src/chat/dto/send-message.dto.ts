import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentInput {
  @IsIn(['image', 'video', 'audio', 'document', 'pdf', 'other'])
  type!: 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'other';

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() mime?: string;
  @IsOptional() @IsString() filename?: string;
  @IsOptional() @IsInt() size?: number;
  @IsOptional() @IsInt() width?: number;
  @IsOptional() @IsInt() height?: number;
  @IsOptional() @IsInt() pages?: number;
  @IsOptional() @IsInt() duration?: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  
  @IsUUID()
  recipientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentInput)
  @ArrayMaxSize(5)
  files?: AttachmentInput[];
}
