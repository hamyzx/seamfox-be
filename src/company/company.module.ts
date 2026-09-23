import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { KanbanBoardModule } from './kanban-board/kanban-board.module';
import { CompanyStatusHistory } from '../company-status-history/entities/company-status-history.entity';
import { EmailService } from '../services/mail.service';
import { CompanySettings } from './entities/company-settings.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyStatusHistory, CompanySettings]),
    KanbanBoardModule,
  ],
  controllers: [CompanyController],
  providers: [CompanyService, EmailService],
  exports: [KanbanBoardModule, CompanyService],
})
export class CompanyModule {}
