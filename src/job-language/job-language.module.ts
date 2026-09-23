import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobLanguage } from './entities/job-language.entity';
import { JobLanguageService } from './job-language.service';
import { JobLanguageController } from './job-language.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobLanguage])],
  controllers: [JobLanguageController],
  providers: [JobLanguageService],
  exports: [JobLanguageService],
})
export class JobLanguageModule {}
