import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialProfile } from './entities/social-profile.entity';
import { SocialProfileService } from './social-profile.service';
import { SocialProfileController } from './social-profile.controller';
import { CandidateModule } from '../candidate/candidate.module';

@Module({
  imports: [CandidateModule, TypeOrmModule.forFeature([SocialProfile])],
  providers: [SocialProfileService],
  controllers: [SocialProfileController],
})
export class SocialProfileModule {}
