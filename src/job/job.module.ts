import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { Job } from './entities/job.entity';
import { JobTitle } from './entities/job-title.entity';
import { KanbanBoardModule } from '../company/kanban-board/kanban-board.module';
import { ApplicationModule } from '../application/application.module';
import { Application } from '../application/entities/application.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { JobSubscription } from './entities/job-subscription.entity';
import { JobExpiryCron } from './job-expiry.cron';
import { JobPublicController } from './job-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobSubscription, JobTitle, Application]),
    KanbanBoardModule,
    forwardRef(() => ApplicationModule),
    SubscriptionModule,
  ],
  providers: [JobService, JobExpiryCron],
  controllers: [JobPublicController,JobController],
  exports: [JobService],
})
export class JobModule {}