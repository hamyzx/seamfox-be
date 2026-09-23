import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NewsArticle } from './entities/news-article.entity';
import { MAX_TOTAL_ARTICLES } from './news.config';

export interface NewsQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  source?: string;
  search?: string;
}

@Injectable()
export class NewsRepository {
  private readonly logger = new Logger(NewsRepository.name);

  constructor(
    @InjectRepository(NewsArticle)
    private readonly repo: Repository<NewsArticle>,
  ) {}

  async upsertArticles(articles: Partial<NewsArticle>[]): Promise<number> {
    if (articles.length === 0) return 0;

    let inserted = 0;
    for (const article of articles) {
      try {
        const existing = await this.repo.findOne({
          where: { externalId: article.externalId },
        });
        if (existing) continue;
        await this.repo.save(article);
        inserted++;
      } catch (err) {
        // Skip on duplicate-key error (race condition)
      }
    }
    return inserted;
  }

  async findAll(params: NewsQueryParams) {
    const { page = 1, limit = 20, category, source, search } = params;

    this.logger.log(
      `[findAll] called with page=${page}, limit=${limit}, category=${category || 'none'}, source=${source || 'none'}, search=${search || 'none'}`,
    );

    const qb = this.repo.createQueryBuilder('news');

    if (category) {
      qb.andWhere('news.category = :category', { category });
    }
    if (source) {
      qb.andWhere('news.sourceId = :source', { source });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(news.title) LIKE :search OR LOWER(news.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('news.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    this.logger.log(
      `[findAll] returning ${data.length} rows | total=${total}, page=${page}, limit=${limit}, totalPages=${totalPages}`,
    );

    return { data, total, page, limit, totalPages };
  }

  async getCategoryCounts(): Promise<{ category: string; count: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('news')
      .select('news.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('news.category IS NOT NULL')
      .groupBy('news.category')
      .getRawMany();
    return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
  }

  async getSourceCounts(): Promise<{ source: string; count: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('news')
      .select('news.sourceId', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('news.sourceId IS NOT NULL')
      .groupBy('news.sourceId')
      .orderBy('count', 'DESC')
      .getRawMany();
    return rows.map((r) => ({ source: r.source, count: Number(r.count) }));
  }

  async pruneOldArticles(): Promise<number> {
    const total = await this.repo.count();
    if (total <= MAX_TOTAL_ARTICLES) return 0;

    const toDelete = total - MAX_TOTAL_ARTICLES;

    const oldArticles = await this.repo
      .createQueryBuilder('news')
      .select('news.id')
      .orderBy('news.publishedAt', 'ASC')
      .take(toDelete)
      .getMany();

    if (oldArticles.length === 0) return 0;

    const ids = oldArticles.map((a) => a.id);
    await this.repo.delete({ id: In(ids) });
    return ids.length;
  }

  async getTotalCount(): Promise<number> {
    return this.repo.count();
  }

  async getLatestFetchTime(): Promise<Date | null> {
    const latest = await this.repo
      .createQueryBuilder('news')
      .orderBy('news.fetchedAt', 'DESC')
      .getOne();
    return latest?.fetchedAt || null;
  }
}