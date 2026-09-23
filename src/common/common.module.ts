import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from '../common/entities/industry.entity';
import { Language } from '../common/entities/language.entity';
import { Nationality } from '../common/entities/nationality.entity';
import { Skill } from '../common/entities/skill.entity';
import { Education } from '../common/entities/education.entity';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Industry, Language, Nationality, Skill, Education])],
  controllers: [CommonController],
  providers: [CommonService],
  exports: [TypeOrmModule],
})
export class CommonModule {}
