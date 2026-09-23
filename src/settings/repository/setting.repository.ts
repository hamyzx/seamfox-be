import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';

@Injectable()
export class SettingRepository {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}
  async update(key: string, updateData: Partial<Setting>) {
    return await this.settingRepository.upsert(updateData, ['key']);
  }

  async findByKey(key: string) {
    if (key) {
      return this.settingRepository.findOneBy({ key });
    }
    return this.settingRepository.find();
  }
}
