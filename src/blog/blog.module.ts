import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { Blog } from './entities/blog.entity';
import { BlogCategory } from './entities/blog-category.entity';
import { BlogRead } from './entities/blog-read.entity';
import { MediaModule } from '../media/media.module';
import { EmailService } from '../services/mail.service';

import { BlogEmailProcessor, BLOG_EMAIL_QUEUE } from './blog-email.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Blog, BlogCategory, BlogRead]),
    MediaModule,
    BullModule.registerQueue({
      name: BLOG_EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [BlogService, EmailService, BlogEmailProcessor],
  controllers: [BlogController],
  exports: [TypeOrmModule],
})
export class BlogModule {}