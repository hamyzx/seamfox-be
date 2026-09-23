import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { Application } from './entities/application.entity';
import { Job } from '../job/entities/job.entity';
import { JobModule } from '../job/job.module';
import { KanbanBoardModule } from '../company/kanban-board/kanban-board.module';
import { EmailService } from '../services/mail.service';
import { ResumeModule } from '../resume/resume.module';
import { CandidateModule } from '../candidate/candidate.module';
import { SubscriptionModule } from '../subscription/subscription.module'; // ✅

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Job]),
    KanbanBoardModule,
    forwardRef(() => JobModule),
    forwardRef(() => ResumeModule),
    forwardRef(() => CandidateModule),
    SubscriptionModule, // ✅
  ],
  providers: [ApplicationService, EmailService],
  controllers: [ApplicationController],
  exports: [ApplicationService],
})
export class ApplicationModule {}