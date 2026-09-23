import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MediaProvider } from './media.provider';
import { ResumeService } from '../resume/resume.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from '../resume/entities/resume.entity';
import { Candidate } from '../candidate/entities/candidate.entity'; 
import { MediaProcessor } from './media.processor';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'cv-processing' }),
    TypeOrmModule.forFeature([Resume, Candidate]), 
    SubscriptionModule,
  ],
  providers: [MediaProcessor, MediaProvider, ResumeService],
  exports: [BullModule],
})
export class MediaQueueModule {}