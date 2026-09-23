import { Module } from '@nestjs/common';
import { CandidateLanguageService } from './candidate-language.service';
import { CandidateLanguageController } from './candidate-language.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateLanguage } from './entities/candidate-language.entity';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule, TypeOrmModule.forFeature([CandidateLanguage])],
  controllers: [CandidateLanguageController],
  providers: [CandidateLanguageService],
  exports: [CandidateLanguageService],
})
export class CandidateLanguageModule {}
