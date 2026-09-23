import { Module } from '@nestjs/common';
import { ResumeDownloadService } from './resume-download.service';
import { ResumeDownloadController } from './resume-download.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeDownloadHistory } from './entities/resume-download.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ResumeModule } from '../resume/resume.module';
import { Resume } from '../resume/entities/resume.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeDownloadHistory, Resume]),

    SubscriptionModule, // provides SubscriptionService
    ResumeModule, // provides ResumeService
  ],
  controllers: [ResumeDownloadController],
  providers: [ResumeDownloadService],
  exports: [ResumeDownloadService],
})
export class ResumeDownloadModule {}
