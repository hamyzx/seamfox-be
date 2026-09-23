import { forwardRef, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaProvider } from './media.provider';
import { MediaQueueModule } from './media-queue.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ResumeModule } from '../resume/resume.module';
import { Candidate } from '../candidate/entities/candidate.entity';
import { Resume } from '../resume/entities/resume.entity'; 

@Global()
@Module({
  imports: [
    MediaQueueModule,
    forwardRef(() => SubscriptionModule),
    ResumeModule,
    TypeOrmModule.forFeature([Candidate, Resume]),
  ],
  controllers: [MediaController],
  providers: [MediaService, MediaProvider],
  exports: [MediaService, MediaProvider],
})
export class MediaModule {}