import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import * as crypto from 'crypto';
import { NewsRepository, NewsQueryParams } from './news.repository';
import {
  NEWS_QUERIES,
  NEWS_SOURCES,
  NEWS_CRON_INTERVAL,
  MAX_ARTICLES_PER_QUERY,
  NEWS_API_URL,
  CompoundQuery,
} from './news.config';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private isFetching = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly newsRepository: NewsRepository,
  ) {}

  async onModuleInit() {
    const total = await this.newsRepository.getTotalCount();
    this.logger.log(`[onModuleInit] DB has ${total} articles`);
    if (total === 0) {
      this.logger.log('News DB is empty — running initial fetch...');
      this.fetchAndStore().catch((err) =>
        this.logger.error('Initial news fetch failed', err),
      );
    }
  }

  @Cron(NEWS_CRON_INTERVAL)
  async scheduledFetch() {
    this.logger.log('🕐 Cron triggered: news fetch');
    try {
      await this.fetchAndStore();
    } catch (err) {
      this.logger.error('Scheduled news fetch failed', err);
    }
  }

  async fetchAndStore(): Promise<{ inserted: number; pruned: number }> {
    if (this.isFetching) {
      this.logger.warn('News fetch already in progress, skipping');
      return { inserted: 0, pruned: 0 };
    }

    this.isFetching = true;
    const apiKey = this.configService.get<string>('NEWS_API_KEY');

    this.logger.log(
      `Using API key: ${apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET'}`,
    );

    if (!apiKey) {
      this.logger.error('NEWS_API_KEY not configured');
      this.isFetching = false;
      return { inserted: 0, pruned: 0 };
    }

    let totalInserted = 0;
    const startTime = Date.now();

    try {
      for (const compoundQuery of NEWS_QUERIES) {
        try {
          const articles = await this.fetchSingleQuery(apiKey, compoundQuery);
          const mapped = articles
            .map((a) => this.mapToEntity(a, compoundQuery))
            .filter((a): a is NonNullable<typeof a> => a !== null);
          const inserted = await this.newsRepository.upsertArticles(mapped);
          totalInserted += inserted;

          await this.sleep(200);
        } catch (err: any) {
          this.logger.warn(
            `Query failed: ${compoundQuery.topic} — ${err?.message || err}`,
          );
        }
      }

      const pruned = await this.newsRepository.pruneOldArticles();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `✅ News fetch complete in ${duration}s — inserted: ${totalInserted}, pruned: ${pruned}`,
      );

      return { inserted: totalInserted, pruned };
    } finally {
      this.isFetching = false;
    }
  }

  private async fetchSingleQuery(
    apiKey: string,
    compoundQuery: CompoundQuery,
  ): Promise<any[]> {
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: compoundQuery.query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: MAX_ARTICLES_PER_QUERY,
        sources: NEWS_SOURCES.join(','),
        apiKey,
      },
      timeout: 15000,
    });

    return response.data?.articles || [];
  }

  private mapToEntity(article: any, compoundQuery: CompoundQuery) {
    if (!article.url || !article.title) return null;

    const externalId = crypto
      .createHash('sha256')
      .update(article.url)
      .digest('hex')
      .slice(0, 32);

    return {
      externalId,
      title: article.title,
      description: article.description || null,
      url: article.url,
      urlToImage: article.urlToImage || null,
      publishedAt: article.publishedAt
        ? new Date(article.publishedAt)
        : new Date(),
      sourceId: article.source?.id || null,
      sourceName: article.source?.name || null,
      author: article.author || null,
      category: compoundQuery.category,
      queryTopic: compoundQuery.topic,
      content: article.content || null,
    };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ════════════════════════════════════════════════════════════════════
  // PUBLIC API METHODS — used by controller
  // ════════════════════════════════════════════════════════════════════
  async getArticles(params: NewsQueryParams) {
    this.logger.log(`[getArticles] params: ${JSON.stringify(params)}`);
    const result = await this.newsRepository.findAll(params);
    this.logger.log(
      `[getArticles] returning ${result.data.length} rows | total=${result.total} | totalPages=${result.totalPages}`,
    );
    return result;
  }

  async getMeta() {
    const [categories, sources, total, lastFetched] = await Promise.all([
      this.newsRepository.getCategoryCounts(),
      this.newsRepository.getSourceCounts(),
      this.newsRepository.getTotalCount(),
      this.newsRepository.getLatestFetchTime(),
    ]);

    return {
      categories,
      sources,
      total,
      lastFetched,
      availableCategories: [
        'oil_gas',
        'lng_natural_gas',
        'coal',
        'shipping',
        'metals',
        'agriculture',
        'fertilisers',
        'trading',
      ],
      availableSources: NEWS_SOURCES,
    };
  }

  async manualFetch() {
    return this.fetchAndStore();
  }
}