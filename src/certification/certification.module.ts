import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from './entities/certification.entity';
import { CertificationService } from './certification.service';
import { CertificationController } from './certification.controller';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule, TypeOrmModule.forFeature([Certification])],
  providers: [CertificationService],
  controllers: [CertificationController],
})
export class CertificationModule {}
