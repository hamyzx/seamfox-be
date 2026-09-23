import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { NewsAggregatorService } from './news-aggregator.service';
import { AiEditorService } from './ai-editor.service';
import { WeeklyBlogService } from './weekly-blog.service';
import { WhatsappSenderService } from './whatsapp-sender.service';
import { AuthGuard } from '../lib/guards/auth.guard';
import { Roles, RolesGuard } from '../lib/guards/roles.guard';
import { UserRoles } from '../lib/enums/user.enum';

@Controller('news-ai')
export class NewsAiController {
  constructor(
    private readonly aggregator: NewsAggregatorService,
    private readonly aiEditor: AiEditorService,
    private readonly weeklyBlog: WeeklyBlogService,
    private readonly whatsappSender: WhatsappSenderService,
  ) {}

  @Get('aggregator-test')
  async testAggregator() {
    const start = Date.now();
    const result = await this.aggregator.fetchAllArticles({ forceFresh: true });
    return {
      success: true,
      totalArticles: result.articles.length,
      totalSuccess: result.totalSuccess,
      totalFailed: result.totalFailed,
      durationMs: Date.now() - start,
      sourceStatus: result.sourceStatus,
      sample: result.articles.slice(0, 3).map((a) => ({
        title: a.title,
        source: a.sourceName,
        topic: a.queryTopic,
        url: a.url,
      })),
    };
  }

  @Post('run-daily')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPER_ADMIN)
  async runDaily() {
    const start = Date.now();
    const result = await this.aiEditor.runDailyCollectionManually();
    return {
      ...result,
      durationMs: Date.now() - start,
      message: `Daily collection complete — ${result.articlesFetched} fetched, ${result.articlesSaved} saved for week ${result.weekOf}`,
    };
  }

  @Post('run-weekly-blog')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPER_ADMIN)
  async runWeeklyBlog() {
    const start = Date.now();
    const result = await this.weeklyBlog.runWeeklyBlogManually();
    return {
      ...result,
      durationMs: Date.now() - start,
      message: `Weekly blog draft created — Blog ID: ${result.blogId}, Top 5 from ${result.totalArticlesInDB} articles`,
    };
  }

  @Post('test-whatsapp')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPER_ADMIN)
  async testWhatsapp() {
    const testPoints = [
      '🛢️ Brent crude jumps 3% to $89.50 amid Middle East tensions',
      '📈 Frontline reports Q1 profit of $559.1M; strongest quarter since 2025',
      '🌍 UK Emissions Trading expands to international maritime sector',
      '⛽ Offshore vessel fleets tightening; utilization trends improve',
      '🚢 Hormuz Strait closure risks greatest energy supply shock in decades',
    ];

    const sent = await this.whatsappSender.sendPointsBundle(testPoints);

    return {
      success: sent,
      message: sent
        ? 'Test WhatsApp message sent to group successfully'
        : 'Failed to send WhatsApp message — check logs',
      pointsSent: testPoints.length,
    };
  }
}