import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundHandler } from '../../lib/helpers/responseHandlers';
import { CreateOtpDto } from '../dto/createOtp.dto';
import { OTP } from '../entities/otp.entity';
import { OTPType } from '../../lib/enums/otp.enum';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
  ) {}

  async findOtpByUserAndCode(createdBy: string, code: number, type: OTPType): Promise<OTP | null> {
    return this.otpRepository.findOne({
      where: { createdBy, code, type },
    });
  }

  async markOtpAsConsumed(id: string): Promise<void> {
    await this.otpRepository.update({ id }, { consumedAt: new Date() });
  }

  async createOtp(otp: CreateOtpDto): Promise<OTP> {
    return this.otpRepository.save(otp);
  }

  async updateOtp(otpId: string, updateData: Partial<OTP>): Promise<OTP> {
    await this.otpRepository.update({ id: otpId }, updateData);

    const updatedOtp = await this.otpRepository.findOne({ where: { id: otpId } });
    if (!updatedOtp) {
      throw new NotFoundHandler({ condition: !updatedOtp, message: 'OTP not found' });
    }
    return updatedOtp;
  }
}
