import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateSkill } from './entities/candidate-skill.entity';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule, TypeOrmModule.forFeature([CandidateSkill])],
  providers: [SkillService],
  controllers: [SkillController],
})
export class SkillsModule {}
