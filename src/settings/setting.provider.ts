import { Injectable, OnModuleInit } from '@nestjs/common';
import { UpdateSettingDto } from './dto/UpdateSetting.dto';
import { SettingRepository } from './repository/setting.repository';
import { SettingKeys } from '../lib/enums/setting.enum';

@Injectable()
export class SettingProvider implements OnModuleInit {
  constructor(private settingRepository: SettingRepository) {}

  // On boot, make sure the split company/member terms & privacy keys exist.
  // They are seeded (once) from the legacy shared keys so live content is not lost,
  // and existing rows are never overwritten so admin edits survive restarts.
  async onModuleInit() {
    await this.seedSplitPolicyKeys();
  }

  private async seedSplitPolicyKeys() {
    const groups = [
      {
        legacy: SettingKeys.TERMS_AND_CONDITIONS,
        targets: [
          SettingKeys.COMPANY_TERMS_AND_CONDITIONS,
          SettingKeys.MEMBER_TERMS_AND_CONDITIONS,
        ],
      },
      {
        legacy: SettingKeys.PRIVACY_POLICY,
        targets: [
          SettingKeys.COMPANY_PRIVACY_POLICY,
          SettingKeys.MEMBER_PRIVACY_POLICY,
        ],
      },
    ];

    for (const group of groups) {
      const legacy = await this.settingRepository.findByKey(group.legacy);
      const legacyValue =
        legacy && !Array.isArray(legacy) ? legacy.value ?? '' : '';

      for (const key of group.targets) {
        const existing = await this.settingRepository.findByKey(key);
        if (!existing) {
          await this.settingRepository.update(key, { key, value: legacyValue });
        }
      }
    }
  }

  async update(payload: UpdateSettingDto) {
    return this.settingRepository.update(payload.key, payload);
  }

  async findByKey(key: string) {
    const setting = await this.settingRepository.findByKey(key);
    return setting;
  }
}
