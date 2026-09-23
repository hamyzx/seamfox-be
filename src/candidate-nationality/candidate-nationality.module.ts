import { Module } from '@nestjs/common';
import { CandidateNationalityService } from './candidate-nationality.service';
import { CandidateNationalityController } from './candidate-nationality.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateNationality } from './entities/candidate-nationality.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { Nationality } from '../common/entities/nationality.entity';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [
    CandidateModule,
    TypeOrmModule.forFeature([CandidateNationality, Candidate, Nationality]),
  ],
  controllers: [CandidateNationalityController],
  providers: [CandidateNationalityService],
  exports: [CandidateNationalityService],
})
export class CandidateNationalityModule {}
