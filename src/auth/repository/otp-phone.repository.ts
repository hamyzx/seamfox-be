import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OTPPhone } from '../entities/otp-phone.entity';
import { OTPType } from '../../lib/enums/otp.enum';

@Injectable()
export class OTPPhoneRepository {
  constructor(
    @InjectRepository(OTPPhone)
    private readonly repo: Repository<OTPPhone>,
  ) {}

  async createOtp(phone: string, code: number, type: OTPType) {
    const otp = this.repo.create({ phone, code, type });
    return this.repo.save(otp);
  }

  async findByPhoneAndCode(phone: string, code: number, type: OTPType) {
    return this.repo.findOne({
      where: { phone, code, type },
    });
  }

  async markAsConsumed(id: string) {
    return this.repo.update(id, { consumedAt: new Date() });
  }
}
