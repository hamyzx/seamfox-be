import { Controller, Get, Post, Query, Logger } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsQueryParams } from './news.repository';

@Controller('news')
export class NewsController {
  private readonly logger = new Logger(NewsController.name);

  constructor(private readonly newsService: NewsService) {}

  // GET /news?page=1&limit=20&category=oil_gas&source=reuters&search=...
  @Get()
  async getNews(@Query() query: any) {
    this.logger.log(`[GET /news] raw query: ${JSON.stringify(query)}`);

    const params: NewsQueryParams = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      category: query.category || undefined,
      source: query.source || undefined,
      search: query.search || undefined,
    };

    const result = await this.newsService.getArticles(params);

    this.logger.log(
      `[GET /news] responding with ${result.data.length} rows | total=${result.total} | totalPages=${result.totalPages}`,
    );

    // 🔥 Interceptor expects { data: ... } shape — extracts response.data and wraps in envelope
    return {
      data: {
        rows: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  // GET /news/meta
  @Get('meta')
  async getMeta() {
    this.logger.log(`[GET /news/meta] called`);
    const data = await this.newsService.getMeta();
    return { data };
  }

  // POST /news/refresh
  @Post('refresh')
  async refresh() {
    this.logger.log(`[POST /news/refresh] manual trigger`);
    const result = await this.newsService.manualFetch();
    return {
      message: 'News refresh triggered',
      data: result,
    };
  }
}