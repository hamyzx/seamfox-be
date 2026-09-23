import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interest } from './entities/interest.entity';
import { InterestService } from './interest.service';
import { InterestController } from './interest.controller';
import { CandidateModule } from '../candidate/candidate.module';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [TypeOrmModule.forFeature([Interest]), CandidateModule, CompanyModule],
  providers: [InterestService],
  controllers: [InterestController],
  exports: [InterestService],
})
export class InterestModule {}
