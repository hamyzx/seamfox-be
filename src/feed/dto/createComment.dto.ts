import { IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 500, { message: 'Comment must be between 2 and 500 characters.' })
  @Matches(/\S/, { message: 'Comment must contain non-whitespace characters.' })
  comment: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
