import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Blog } from '../blog/entities/blog.entity';
import { BlogCategory } from '../blog/entities/blog-category.entity';
import { NewsArticleWeekly } from './entities/news-articles-weekly.entity';
import { WhatsappPoint } from './entities/whatsapp-points.entity';
import { NewsAggregatorService } from './news-aggregator.service';
import { AiEditorService } from './ai-editor.service';
import { WeeklyBlogService } from './weekly-blog.service';
import { WhatsappSenderService } from './whatsapp-sender.service';
import { NewsAiController } from './news-ai.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Blog,
      BlogCategory,
      NewsArticleWeekly,
      WhatsappPoint,
    ]),
  ],
  providers: [
    NewsAggregatorService,
    WeeklyBlogService,         // 🔥 BEFORE AiEditorService — dependency order
    AiEditorService,
    WhatsappSenderService,
  ],
  controllers: [NewsAiController],
})
export class NewsAiModule {}