import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Education } from './entities/education.entity';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule, TypeOrmModule.forFeature([Education])],
  providers: [EducationService],
  controllers: [EducationController],
})
export class EducationModule {}
