import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ResumeDownloadHistory } from './entities/resume-download.entity';
import { Resume } from '../resume/entities/resume.entity';

@Injectable()
export class ResumeDownloadService {
  constructor(
    @InjectRepository(ResumeDownloadHistory)
    private readonly historyRepo: Repository<ResumeDownloadHistory>,

    @InjectRepository(Resume)
    private readonly resumeRepo: Repository<Resume>,
  ) {}

  private getStartOfMonth() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Count DISTINCT resume downloads this month
   */
  async checkLimit(companyId: number, limit: number | null) {
    const startOfMonth = this.getStartOfMonth();

    const count = await this.historyRepo
      .createQueryBuilder('h')
      .select('COUNT(DISTINCT h.resumeId)', 'count')
      .where('h.companyId = :companyId', { companyId })
      .andWhere('h.downloadedAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const used = Number(count.count);

    if (limit !== null && used >= limit) {
      throw new BadRequestException(
        `Monthly cv's download limit (${limit}) reached, Upgrade your plan to to download more cv's.`,
      );
    }

    return {
      used,
      limit,
      remaining: limit !== null ? limit - used : 'unlimited',
    };
  }

  /**
   * Check if already downloaded this resume this month
   * (ONLY FIRST DOWNLOAD CREATES ENTRY)
   */
  async wasDownloadedThisMonth(companyId: number, resumeId: number) {
    const startOfMonth = this.getStartOfMonth();

    return await this.historyRepo.findOne({
      where: {
        companyId,
        resumeId,
        downloadedAt: MoreThanOrEqual(startOfMonth),
      },
    });
  }

  /**
   * Log ONLY FIRST download for the month
   * Allow unlimited downloads, but only 1 log entry
   */
  async logDownloadOncePerMonth(companyId: number, resumeId: number) {
    const resume = await this.resumeRepo.findOne({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');

    const startOfMonth = this.getStartOfMonth();

    // Check if already logged
    const existing = await this.historyRepo.findOne({
      where: {
        companyId,
        resumeId,
        downloadedAt: MoreThanOrEqual(startOfMonth),
      },
    });

    if (existing) {
      // already logged, no need to insert again
      return existing;
    }

    // Insert only once
    return await this.historyRepo.save({
      companyId,
      resumeId,
    });
  }
}
