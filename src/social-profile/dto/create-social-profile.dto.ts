import { IsInt, IsEnum, IsString, IsOptional } from 'class-validator';
import { SocialMedias } from '../../lib/enums/user.enum';

export class CreateSocialProfileDto {
  @IsInt()
  @IsOptional()
  candidateId: number;

  @IsEnum(SocialMedias)
  platform: SocialMedias;

  @IsString()
  url: string;
}
