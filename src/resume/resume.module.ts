import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from './entities/resume.entity';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { CandidateModule } from '../candidate/candidate.module';
import { SubscriptionModule } from '../subscription/subscription.module'; // ✅

@Module({
  imports: [
    CandidateModule,
    TypeOrmModule.forFeature([Resume]),
    SubscriptionModule,
  ],
  providers: [ResumeService],
  controllers: [ResumeController],
  exports: [ResumeService],
})
export class ResumeModule {}