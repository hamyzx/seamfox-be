import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SettingKeys } from '../../lib/enums/setting.enum';

export class UpdateSettingDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsNotEmpty()
  @IsEnum(SettingKeys)
  key: SettingKeys;
}
