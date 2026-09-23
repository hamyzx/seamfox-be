import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { IResponse } from '../lib/interfaces/response.interface';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { UpdateSettingDto } from './dto/UpdateSetting.dto';
import { SettingProvider } from './setting.provider';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingProvider: SettingProvider) {}

  @Put()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPER_ADMIN)
  async update(@Body() payload: UpdateSettingDto): Promise<IResponse> {
    const data = await this.settingProvider.update(payload);
    return { data };
  }

  @Get()
  async getOne(@Query('key') key: string): Promise<IResponse> {
    const data = await this.settingProvider.findByKey(key);
    return { data };
  }
}
