import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminJobController } from './admin-job.controller';
import { AdminJobService } from './admin-job.service';
import { Job } from '../job/entities/job.entity';
import { Application } from '../application/entities/application.entity';
import { Education } from '../common/entities/education.entity';
import { KanbanBoardModule } from '../company/kanban-board/kanban-board.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Application, Education]),
    KanbanBoardModule,
  ],
  controllers: [AdminJobController],
  providers: [AdminJobService],
  exports: [AdminJobService],
})
export class AdminJobModule {}