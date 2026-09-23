import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';
import { Candidate } from './entities/candidate.entity';
import { CandidateStatusHistory } from '../candidate-status-history/entities/candidate-status-history.entity';
import { EmailService } from '../services/mail.service';
import { CandidateProfileView } from './entities/candidate-profile-view.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { LoginActivity } from '../auth/entities/login-activity.entity';
import { JobTitle } from '../job/entities/job-title.entity';
import { Application } from '../application/entities/application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Candidate,
      CandidateStatusHistory,
      CandidateProfileView,
      LoginActivity,
      JobTitle,
      Application,
    ]),
    SubscriptionModule,
  ],
  providers: [CandidateService, EmailService],
  controllers: [CandidateController],
  exports: [TypeOrmModule, CandidateService],
})
export class CandidateModule {}