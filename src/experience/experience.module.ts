import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Experience } from './entities/experience.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { ExperienceProvider } from './experience.provider';
import { ExperienceController } from './experience.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Experience, Candidate])],
  controllers: [ExperienceController],
  providers: [ExperienceProvider],
  exports: [ExperienceProvider],
})
export class ExperienceModule {}