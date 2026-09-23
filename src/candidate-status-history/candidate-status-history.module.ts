import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateStatusHistoryService } from './candidate-status-history.service';
import { CandidateStatusHistoryController } from './candidate-status-history.controller';
import { CandidateStatusHistory } from './entities/candidate-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateStatusHistory])],
  controllers: [CandidateStatusHistoryController],
  providers: [CandidateStatusHistoryService],
  exports: [CandidateStatusHistoryService],
})
export class CandidateStatusHistoryModule {}
