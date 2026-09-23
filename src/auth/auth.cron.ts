import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthCronService {
  private readonly logger = new Logger(AuthCronService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async permanentlyDeleteExpiredAccounts() {
    const now = new Date();
    const expired = await this.userRepository.find({
      where: {
        scheduledDeletionAt: LessThan(now),
      } as any,
      withDeleted: true,
    });

    if (expired.length === 0) return;

    this.logger.log(`Permanently deleting ${expired.length} expired accounts`);

    for (const user of expired) {
      try {
        // Hard delete — cascade will clean up candidate, education, etc.
        await this.userRepository.delete(user.id);
      } catch (err) {
        this.logger.error(`Failed to delete user ${user.id}:`, err);
      }
    }
  }
}