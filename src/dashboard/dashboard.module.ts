import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

import { AuthModule } from '../auth/auth.module';
import { CandidateModule } from '../candidate/candidate.module';
import { CompanyModule } from '../company/company.module';
import { JobModule } from '../job/job.module';
import { ApplicationModule } from '../application/application.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    CandidateModule,
    CompanyModule,
    JobModule,
    ApplicationModule,
    SubscriptionModule,
    AuthModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
