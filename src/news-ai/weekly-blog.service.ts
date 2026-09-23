import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NewsArticleWeekly } from './entities/news-articles-weekly.entity';
import { Blog } from '../blog/entities/blog.entity';
import { BlogCategory } from '../blog/entities/blog-category.entity';

@Injectable()
export class WeeklyBlogService {
  private readonly logger = new Logger(WeeklyBlogService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(NewsArticleWeekly)
    private readonly weeklyArticleRepo: Repository<NewsArticleWeekly>,
    @InjectRepository(Blog)
    private readonly blogRepo: Repository<Blog>,
    @InjectRepository(BlogCategory)
    private readonly blogCategoryRepo: Repository<BlogCategory>,
  ) {}


  async runWeeklyBlog(): Promise<void> {
    const weekOf = this.getWeekOf();
    this.logger.log(`[Friday Cron] Starting weekly blog generation — ${weekOf}`);

    try {
      this.logger.log('Step 1/4: Fetching full week articles from DB...');
      const articles = await this.weeklyArticleRepo.find({
        where: { weekOf },
        order: { fetchedDate: 'ASC', id: 'ASC' },
      });

      this.logger.log(`Found ${articles.length} articles for week ${weekOf}`);

      if (articles.length === 0) {
        this.logger.warn(`[Friday Cron] No articles found for week ${weekOf} — aborting`);
        return;
      }

      this.logger.log('Step 2/4: AI selecting top 5 from full week...');
      const top5 = await this.selectTop5WithAI(articles);
      this.logger.log('AI selected top 5 articles');

      for (const article of top5) {
        await this.weeklyArticleRepo.update(article.id, { isTopPick: true });
      }

      this.logger.log('Step 3/4: Generating weekly blog...');
      const blogData = await this.generateWeeklyBlog(top5, weekOf);
      this.logger.log(`Blog generated: "${blogData.title}"`);

      this.logger.log('Step 4/4: Saving blog draft...');
      const blog = await this.saveBlogDraft(blogData, top5, weekOf);
      this.logger.log(`Blog saved — ID: ${blog.id}`);

      for (const article of top5) {
        await this.weeklyArticleRepo.update(article.id, { usedInBlog: true });
      }

      this.logger.log(`[Friday Cron] Weekly blog complete — Blog ID: ${blog.id}`);
    } catch (error) {
      this.logger.error(
        `[Friday Cron] Failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async selectTop5WithAI(articles: NewsArticleWeekly[]): Promise<NewsArticleWeekly[]> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const candidates = articles.slice(0, 50);

    const articleList = candidates
      .map(
        (a, i) =>
          `${i + 1}. [${a.sourceName}] [${a.fetchedDate}] ${a.title} — ${a.description || ''}`,
      )
      .join('\n');

    const prompt = `You are a maritime and energy industry news editor. From this week's news articles (Monday to Thursday), select the TOP 5 most important, impactful, and newsworthy articles for a professional maritime/energy candidate audience.

WEEK ARTICLES:
${articleList}

Respond ONLY with a JSON array of article numbers (1-based). Example: [3, 7, 15, 22, 41]
No explanation, no markdown, just the JSON array.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';

    let indices: number[] = [];
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      indices = JSON.parse(clean);
    } catch {
      this.logger.warn('Failed to parse AI indices, using first 5');
      indices = [1, 2, 3, 4, 5];
    }

    return indices
      .filter((i) => i >= 1 && i <= candidates.length)
      .slice(0, 5)
      .map((i) => candidates[i - 1]);
  }

  private async generateWeeklyBlog(
    top5: NewsArticleWeekly[],
    weekOf: string,
  ): Promise<{ title: string; content: string; category: string }> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const articleDetails = top5
      .map(
        (a, i) =>
          `${i + 1}. ${a.title}\n   Source: ${a.sourceName} | Date: ${a.fetchedDate}\n   ${a.description || ''}`,
      )
      .join('\n\n');

    const prompt = `You are a senior maritime and energy industry journalist writing a weekly digest blog post for maritime professionals and job seekers.

WEEK: ${weekOf}
TOP 5 ARTICLES SELECTED FROM THIS WEEK:

${articleDetails}

Write a comprehensive weekly industry digest. Requirements:
- Length: 800-1000 words
- Tone: Professional, authoritative, analytical
- Structure:
  * Compelling headline
  * Executive summary (2-3 sentences)
  * 3-4 themed sections covering the week's major topics
  * Forward-looking conclusion
- Include specific data points and numbers where available
- Connect related stories to show broader industry trends
- Target audience: Maritime professionals, candidates, job seekers in shipping/energy

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "title": "Weekly digest headline here",
  "category": "one of: shipping, oil_gas, agriculture, trading",
  "content": "Full HTML blog post with <h2>, <p>, <strong> tags"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() || '';

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return {
        title: `Maritime & Energy Weekly Digest — ${weekOf}`,
        content: `<p>${text}</p>`,
        category: 'shipping',
      };
    }
  }

  private async saveBlogDraft(
    blogData: { title: string; content: string; category: string },
    articles: NewsArticleWeekly[],
    weekOf: string,
  ): Promise<Blog> {
    const category = await this.findOrCreateCategory(blogData.category);

    const slug =
      blogData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) +
      '-' +
      weekOf.toLowerCase();

    const shortDescription = blogData.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

    const sourceUrls = articles.map((a) => a.url).join(', ');
    const sourceTitles =
      `Weekly Digest ${weekOf} — ${articles.length} articles | ` +
      articles.map((a) => a.title).join(' | ');

    const blog = new Blog();
    blog.title = blogData.title;
    blog.shortDescription = shortDescription;
    blog.content = blogData.content;
    blog.slug = slug;
    blog.status = 'DRAFT' as any;
    blog.category = category;
    blog.isAiGenerated = true;
    blog.aiGeneratedAt = new Date();
    blog.aiSourceUrl = sourceUrls.slice(0, 2000);
    blog.aiSourceTitle = sourceTitles.slice(0, 500);

    return await this.blogRepo.save(blog);
  }

  private async findOrCreateCategory(categoryName: string): Promise<BlogCategory> {
    const categoryMap: Record<string, string> = {
      shipping: 'Shipping',
      oil_gas: 'Oil & Gas',
      agriculture: 'Agriculture',
      trading: 'Trading',
      coal: 'Coal',
    };

    const mappedName = categoryMap[categoryName] || 'Shipping';

    let category = await this.blogCategoryRepo.findOne({ where: { name: mappedName } });

    if (!category) {
      this.logger.warn(`Category "${mappedName}" not found, using fallback`);
      category = await this.blogCategoryRepo.findOne({ where: {} });
      if (!category) throw new Error('No blog categories found in DB');
    }

    return category;
  }

  async runWeeklyBlogManually(): Promise<{
    success: boolean;
    blogId: number;
    blogTitle: string;
    totalArticlesInDB: number;
    top5Selected: number;
    weekOf: string;
  }> {
    const weekOf = this.getWeekOf();

    const articles = await this.weeklyArticleRepo.find({
      where: { weekOf },
      order: { fetchedDate: 'ASC', id: 'ASC' },
    });

    if (articles.length === 0) {
      throw new Error(
        `No articles in DB for week ${weekOf}. Run /run-daily first.`,
      );
    }

    const top5 = await this.selectTop5WithAI(articles);
    for (const a of top5) {
      await this.weeklyArticleRepo.update(a.id, { isTopPick: true });
    }

    const blogData = await this.generateWeeklyBlog(top5, weekOf);
    const blog = await this.saveBlogDraft(blogData, top5, weekOf);

    for (const a of top5) {
      await this.weeklyArticleRepo.update(a.id, { usedInBlog: true });
    }

    return {
      success: true,
      blogId: blog.id,
      blogTitle: blog.title,
      totalArticlesInDB: articles.length,
      top5Selected: top5.length,
      weekOf,
    };
  }

  private getWeekOf(): string {
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