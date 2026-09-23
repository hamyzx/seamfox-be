import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobStatus } from '../lib/enums/job.enum';

@Injectable()
export class JobExpiryCron {
  private readonly logger = new Logger(JobExpiryCron.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOverdueJobs(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.jobRepo
        .createQueryBuilder()
        .update(Job)
        .set({ status: JobStatus.EXPIRED })
        .where('jobExpiryDate IS NOT NULL')
        .andWhere('jobExpiryDate < :today', { today })
        .andWhere('status = :openStatus', { openStatus: JobStatus.OPENED })
        .execute();

      const affected = result.affected ?? 0;
      if (affected > 0) {
        this.logger.log(`[JobExpiryCron] Marked ${affected} job(s) as Expired`);
      } else {
        this.logger.log('[JobExpiryCron] No jobs to expire');
      }
    } catch (err: any) {
      this.logger.error(
        `[JobExpiryCron] Failed to expire jobs: ${err?.message ?? err}`,
      );
    }
  }
}