import { Module } from '@nestjs/common';
import { CandidateViewService } from './candidate-view.service';
import { CandidateViewController } from './candidate-view.controller';
import { CandidateView } from './entities/candidate-view.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../notification/notification.module';
import { Company } from '../company/entities/company.entity';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateView, Candidate, Company]),
    NotificationModule,
    SubscriptionModule,
  ],
  controllers: [CandidateViewController],
  providers: [CandidateViewService],
})
export class CandidateViewModule {}
