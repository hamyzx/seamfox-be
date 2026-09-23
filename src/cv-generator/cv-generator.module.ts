
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvGeneratorController } from './cv-generator.controller';
import { CvGeneratorProvider } from './cv-generator.provider';
import { CvGeneratorUpload } from './entities/cv-generator-upload.entity';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CvGeneratorUpload]),
    MediaModule,
  ],
  controllers: [CvGeneratorController],
  providers: [CvGeneratorProvider],
  exports: [CvGeneratorProvider],
})
export class CvGeneratorModule {}