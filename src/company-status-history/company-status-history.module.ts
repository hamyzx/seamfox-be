import { Module } from '@nestjs/common';
import { CompanyStatusHistoryService } from './company-status-history.service';
import { CompanyStatusHistoryController } from './company-status-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyStatusHistory } from './entities/company-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyStatusHistory])],
  controllers: [CompanyStatusHistoryController],
  providers: [CompanyStatusHistoryService],
})
export class CompanyStatusHistoryModule {}
