import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { SettingController } from './setting.controller';
import { SettingRepository } from './repository/setting.repository';
import { SettingProvider } from './setting.provider';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting])],
  controllers: [SettingController],
  providers: [SettingProvider, SettingRepository],
  exports: [SettingProvider],
})
export class SettingModule {}
