import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NewsAggregatorService } from './news-aggregator.service';
import { WhatsappSenderService } from './whatsapp-sender.service';
import { WeeklyBlogService } from './weekly-blog.service';
import { NewsArticleWeekly } from './entities/news-articles-weekly.entity';

@Injectable()
export class AiEditorService {
  private readonly logger = new Logger(AiEditorService.name);

  // 🔥 Concurrency locks — prevent duplicate runs of the same task
  private isDailyRunning = false;
  private isCleanupRunning = false;

  // 🔥 Track last successful run to skip rapid duplicate calls (de-dupe within 60s)
  private lastDailyRunAt: number | null = null;
  private readonly MIN_GAP_MS = 60 * 1000;

  constructor(
    private readonly aggregator: NewsAggregatorService,
    private readonly config: ConfigService,
    private readonly whatsappSender: WhatsappSenderService,
    private readonly weeklyBlog: WeeklyBlogService,
    @InjectRepository(NewsArticleWeekly)
    private readonly weeklyArticleRepo: Repository<NewsArticleWeekly>,
  ) {}

  @Cron('0 6 * * *', { timeZone: 'Asia/Karachi', name: 'daily-collection' })
  async runDailyCollection(): Promise<void> {
    // 🔥 Guard 1: Already running? Skip.
    if (this.isDailyRunning) {
      this.logger.warn('[Daily Cron] Already running — skipping duplicate trigger');
      return;
    }

    // 🔥 Guard 2: Ran very recently? Skip (handles same-tick double-fire).
    if (
      this.lastDailyRunAt &&
      Date.now() - this.lastDailyRunAt < this.MIN_GAP_MS
    ) {
      this.logger.warn(
        `[Daily Cron] Last run was ${Math.round(
          (Date.now() - this.lastDailyRunAt) / 1000,
        )}s ago — skipping`,
      );
      return;
    }

    this.isDailyRunning = true;
    this.lastDailyRunAt = Date.now();

    const today = this.getTodayStr();
    const weekOf = this.getWeekOf();
    this.logger.log(`[Daily Cron] Starting — ${today} (${weekOf})`);

    try {
      this.logger.log('Step 1/3: Fetching all articles...');
      const { articles, totalSuccess, totalFailed } =
        await this.aggregator.fetchAllArticles({ forceFresh: true });
      this.logger.log(
        `Fetched ${articles.length} articles (${totalSuccess} sources ok, ${totalFailed} failed)`,
      );

      if (articles.length === 0) {
        this.logger.warn('No articles fetched — aborting');
        return;
      }

      this.logger.log('Step 2/3: Saving all articles to DB...');
      const savedCount = await this.saveAllArticles(articles, today, weekOf);
      this.logger.log(`${savedCount} new articles saved (duplicates skipped)`);

      this.logger.log('Step 3/3: Generating + sending WhatsApp points...');
      await this.generateAndSendWhatsappPoints(articles, today);

      this.logger.log(`[Daily Cron] Complete — ${today}`);
    } catch (error) {
      this.logger.error(
        `[Daily Cron] Failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      // 🔥 Always release the lock, even on error
      this.isDailyRunning = false;
    }
  }

  @Cron('0 2 * * *', { timeZone: 'Asia/Karachi', name: 'cleanup' })
  async runCleanup(): Promise<void> {
    if (this.isCleanupRunning) {
      this.logger.warn('[Cleanup Cron] Already running — skipping');
      return;
    }

    this.isCleanupRunning = true;
    this.logger.log('[Cleanup Cron] Starting 30-day old data cleanup...');

    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const deleted = await this.weeklyArticleRepo
        .createQueryBuilder()
        .delete()
        .where('created_at < :cutoff', { cutoff })
        .execute();

      this.logger.log(
        `[Cleanup Cron] Deleted ${deleted.affected} articles older than 30 days`,
      );
    } catch (error) {
      this.logger.error(
        `[Cleanup Cron] Failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      this.isCleanupRunning = false;
    }
  }

  private async saveAllArticles(
    articles: any[],
    fetchedDate: string,
    weekOf: string,
  ): Promise<number> {
    let savedCount = 0;

    for (const article of articles) {
      try {
        const existing = await this.weeklyArticleRepo.findOne({
          where: { url: article.url },
        });
        if (existing) continue;

        const entity = new NewsArticleWeekly();
        entity.title = article.title || 'Untitled';
        entity.description = article.description || null;
        entity.url = article.url;
        entity.urlToImage = article.urlToImage || null;
        entity.publishedAt = new Date(article.publishedAt);
        entity.sourceId = article.sourceId || null;
        entity.sourceName = article.sourceName || null;
        entity.category = article.category || null;
        entity.queryTopic = article.queryTopic || null;
        entity.fetchedDate = fetchedDate;
        entity.weekOf = weekOf;
        entity.isTopPick = false;
        entity.usedInBlog = false;

        await this.weeklyArticleRepo.save(entity);
        savedCount++;
      } catch {
        // skip duplicate
      }
    }

    return savedCount;
  }

  private async generateAndSendWhatsappPoints(
    articles: any[],
    today: string,
  ): Promise<void> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const shuffled = [...articles].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, 30);

    const articleList = sample
      .map(
        (a, i) =>
          `${i + 1}. [${a.sourceName}] ${a.title} — ${a.description || ''}`,
      )
      .join('\n');

    const angles = [
      'price movements and market shifts',
      'company actions, deals, and corporate announcements',
      'geopolitical and regulatory developments',
      'sustainability, fuel transition, and emissions',
      'supply chain, logistics, and operational news',
      'M&A, investments, and financial announcements',
      'technology, innovation, and infrastructure',
      'safety, security, and incidents',
    ];
    const randomAngle = angles[Math.floor(Math.random() * angles.length)];

    const prompt = `You are a maritime industry news analyst. From the articles below, generate 5 DIVERSE WhatsApp broadcast points for maritime professionals.

ARTICLES:
${articleList}

IMPORTANT — DIVERSITY RULES:
- Pick 5 articles from DIFFERENT topics — do NOT focus on similar themes
- Lean toward this angle this time: ${randomAngle}
- Each point must cover a DIFFERENT story (no repeats of same company/topic)
- Vary sentence structure — do not start every point the same way
- Mix: prices, deals, regulations, tech, geopolitics, operations

Each point:
- MUST be under 20 words
- Include specific numbers, percentages, or prices where available
- Be direct and impactful
- DO NOT use emojis anywhere
- Plain text only

Respond ONLY with 5 lines. No emojis, no JSON, no markdown, no numbering.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        temperature: 1.0,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';

    const lines = text
      .split('\n')
      .filter((l: string) => l.trim().length > 0)
      .map((l: string) =>
        l
          .replace(
            /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F2FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]/gu,
            '',
          )
          .replace(/^\s*\d+[\.\)]\s*/, '')
          .trim(),
      )
      .filter((l: string) => l.length > 0)
      .slice(0, 5);

    this.logger.log(`WhatsApp points for ${today} (angle: ${randomAngle}):`);
    lines.forEach((line: string, i: number) => {
      this.logger.log(`   ${i + 1}. ${line}`);
    });

    try {
      const sent = await this.whatsappSender.sendPointsBundle(lines);
      if (sent) {
        this.logger.log('WhatsApp points sent to group successfully');
      } else {
        this.logger.warn('WhatsApp send returned false');
      }
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp points: ${(error as Error).message}`,
      );
    }
  }

  async runDailyCollectionManually(): Promise<{
    success: boolean;
    articlesFetched: number;
    articlesSaved: number;
    weekOf: string;
    fetchedDate: string;
    skipped?: boolean;
    reason?: string;
  }> {
    // 🔥 Same guard for manual trigger — prevents accidental double-click on admin button
    if (this.isDailyRunning) {
      this.logger.warn('[Manual Daily] Already running — skipping');
      return {
        success: false,
        articlesFetched: 0,
        articlesSaved: 0,
        weekOf: this.getWeekOf(),
        fetchedDate: this.getTodayStr(),
        skipped: true,
        reason: 'A daily run is already in progress',
      };
    }

    this.isDailyRunning = true;
    this.lastDailyRunAt = Date.now();

    try {
      const today = this.getTodayStr();
      const weekOf = this.getWeekOf();

      const { articles } = await this.aggregator.fetchAllArticles({
        forceFresh: true,
      });
      const savedCount = await this.saveAllArticles(articles, today, weekOf);
      await this.generateAndSendWhatsappPoints(articles, today);

      return {
        success: true,
        articlesFetched: articles.length,
        articlesSaved: savedCount,
        weekOf,
        fetchedDate: today,
      };
    } finally {
      this.isDailyRunning = false;
    }
  }

  getTodayStr(): string {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60000);
    return pk.toISOString().split('T')[0];
  }

  getWeekOf(): string {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60000);

    const date = new Date(pk);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum =
      1 +
      Math.round(
        ((date.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      );
    return `${pk.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }
}