import { Module } from '@nestjs/common';
import { CandidateSkillService } from './candidate-skills.service';
import { CandidateSkillController } from './candidate-skills.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateSkill } from './entities/candidate-skills.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { Skill } from '../common/entities/skill.entity';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [
    CandidateModule,
    TypeOrmModule.forFeature([CandidateSkill, Candidate, Skill]),
  ],
  controllers: [CandidateSkillController],
  providers: [CandidateSkillService],
  exports: [CandidateSkillService],
})
export class CandidateSkillModule {}
