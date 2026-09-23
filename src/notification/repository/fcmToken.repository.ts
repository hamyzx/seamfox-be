import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FcmToken } from '../entities/fcmToken.entity';
import { CreateFcmTokenDto } from '../dto/createFcmToken.dto';

@Injectable()
export class FcmTokenRepository {
  constructor(
    @InjectRepository(FcmToken)
    private readonly repo: Repository<FcmToken>,
  ) {}

  async createToken(payload: CreateFcmTokenDto): Promise<FcmToken> {
    const token = this.repo.create(payload);
    return this.repo.save(token);
  }

  async findTokensByUserIds(userIds: string[]): Promise<FcmToken[]> {
    return this.repo.find({
      where: { createdBy: In(userIds) },
    });
  }

  async getTokenByFcmToken(fcmToken: string) {
    return this.repo.findOne({
      where: { fcmToken },
    });
  }

  async deleteByToken(fcmToken: string) {
    return await this.repo.delete({ fcmToken });
  }
  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ createdBy: userId } as any);
  }
}
