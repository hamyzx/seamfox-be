import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminKanbanController } from './admin-kanban.controller';
import { AdminKanbanService } from './admin-kanban.service';
import { Job } from '../job/entities/job.entity';
import { Application } from '../application/entities/application.entity';
import { KanbanBoardModule } from '../company/kanban-board/kanban-board.module';
import { ApplicationCommentModule } from '../application-comment/application-comment.module';
import { EmailService } from '../services/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Application]),
    KanbanBoardModule,
    ApplicationCommentModule,
  ],
  controllers: [AdminKanbanController],
  providers: [AdminKanbanService, EmailService],
  exports: [AdminKanbanService],
})
export class AdminKanbanModule {}