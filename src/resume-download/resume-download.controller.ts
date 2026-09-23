import { Controller, Get, Post, Param, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';
import { ResumeDownloadService } from './resume-download.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ResumeService } from '../resume/resume.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('candidate/resume')
export class ResumeDownloadController {
  constructor(
    private readonly resumeDownloadService: ResumeDownloadService,
    private readonly subscriptionService: SubscriptionService,
    private readonly resumeService: ResumeService,
  ) {}

  /**
   * CHECK LIMIT BEFORE DOWNLOAD
   */
  @Get(':resumeId/check-download')
  @Roles(UserRoles.COMPANY)
  async checkDownload(@Param('resumeId', ParseIntPipe) resumeId: number, @Req() req: Request) {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const limit = await this.subscriptionService.getFeatureLimit(userId, 11);

    if (limit !== null && limit?.limit !== '') {
      const alreadyDownloaded = await this.resumeDownloadService.wasDownloadedThisMonth(
        companyId,
        resumeId,
      );

      // ❌ If NOT downloaded yet → apply limit check
      if (!alreadyDownloaded) {
        await this.resumeDownloadService.checkLimit(companyId, Number(limit?.limit));
      }

      return {
        resumeId,
        alreadyDownloaded: !!alreadyDownloaded,
      };
    }

    return {
      resumeId,
    };
  }

  @Post(':resumeId/download')
  @Roles(UserRoles.COMPANY)
  async downloadResume(@Param('resumeId', ParseIntPipe) resumeId: number, @Req() req: Request) {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const limit = await this.subscriptionService.getFeatureLimit(userId, 11);

    // Check if already downloaded this resume this month
    const alreadyDownloaded = await this.resumeDownloadService.wasDownloadedThisMonth(
      companyId,
      resumeId,
    );

    if (
      limit !== null &&
      limit.limit !== '' &&
      limit?.limit !== 'true' &&
      limit?.limit?.toLowerCase() !== 'unlimited'
    ) {
      // ❌ If NOT downloaded yet → apply limit check
      if (!alreadyDownloaded) {
        await this.resumeDownloadService.checkLimit(companyId, Number(limit?.limit));
      }

      // Log only ONCE per month
      await this.resumeDownloadService.logDownloadOncePerMonth(companyId, resumeId);

      return {
        message: alreadyDownloaded
          ? 'Already downloaded this month — no limit counted'
          : 'Download logged successfully',
      };
    }

    const resume = await this.resumeService.getResumeById(resumeId);

    return {
      message: alreadyDownloaded
        ? 'Already downloaded this month — no limit counted'
        : 'Download logged successfully',
      downloadUrl: resume.filePath,
    };
  }
}
