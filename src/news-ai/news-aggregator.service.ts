import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Article,
  FeedSource,
  FetchAllResult,
  RSS_SOURCES,
  SourceStatus,
} from './rss-sources.config';

/**
 * 🔥 News Aggregator Service (no DB)
 *
 * Ported from frontend `src/lib/api/news-service.ts` to backend.
 *
 * Responsibilities:
 *  - Parallel fetch all RSS feeds + Marketaux API
 *  - Custom RSS XML parser (handles CDATA, images, dedup)
 *  - In-memory caching (5min TTL)
 *  - Returns consolidated article list for AI editor
 *
 * No database — pure data fetching service.
 */

type FetchInternalResult = {
  source: FeedSource;
  articles: Article[];
  success: boolean;
  durationMs: number;
  error?: string;
  status?: number;
  marketauxFound?: number;
};

export type FetchOptions = {
  forceFresh?: boolean;
  timeoutMs?: number;
};

@Injectable()
export class NewsAggregatorService {
  private readonly logger = new Logger(NewsAggregatorService.name);

  // In-memory cache (5 min TTL)
  private cache: { result: FetchAllResult; fetchedAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly configService: ConfigService) {}

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 MAIN ENTRY POINT — Fetch all sources in parallel
  // ═══════════════════════════════════════════════════════════════════
  async fetchAllArticles(options: FetchOptions = {}): Promise<FetchAllResult> {
    const { forceFresh = false, timeoutMs = 15000 } = options;

    // Cache hit?
    if (!forceFresh && this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL_MS) {
      const ageSec = Math.round((Date.now() - this.cache.fetchedAt) / 1000);
      this.logger.log(
        `📦 Serving from cache (${ageSec}s old, ${this.cache.result.articles.length} articles)`,
      );
      return this.cache.result;
    }

    if (forceFresh) this.logger.log(`🔄 forceFresh=true, bypassing cache`);

    this.logger.log(
      `🚀 Starting fresh fetch of ${RSS_SOURCES.length} sources (timeout=${timeoutMs}ms per feed)`,
    );

    const marketauxKey = this.configService.get<string>('MARKETAUX_API_KEY');
    this.logger.log(
      `📡 MARKETAUX_API_KEY: ${marketauxKey ? '✓ set (' + marketauxKey.slice(0, 8) + '...)' : '✗ NOT SET'}`,
    );

    const startTime = Date.now();

    // Parallel fetch all sources
    const promises = RSS_SOURCES.map((s) =>
      s.type === 'rss' ? this.fetchRss(s, timeoutMs) : this.fetchMarketaux(s, timeoutMs),
    );
    const results = await Promise.allSettled(promises);

    const all: Article[] = [];
    const sourceStatus: SourceStatus[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const source = RSS_SOURCES[i];

      if (r.status === 'fulfilled') {
        const fr = r.value;
        all.push(...fr.articles);
        sourceStatus.push({
          feedId: source.feedId,
          publisher: source.publisher,
          sourceId: source.sourceId,
          queryTopic: source.queryTopic,
          success: fr.success,
          count: fr.articles.length,
          durationMs: fr.durationMs,
          error: fr.error,
          status: fr.status,
          marketauxFound: fr.marketauxFound,
        });
        if (fr.success) totalSuccess++;
        else totalFailed++;
      } else {
        this.logger.error(`❌ Promise rejected for ${source.feedId}:`, r.reason);
        sourceStatus.push({
          feedId: source.feedId,
          publisher: source.publisher,
          sourceId: source.sourceId,
          queryTopic: source.queryTopic,
          success: false,
          count: 0,
          durationMs: 0,
          error: r.reason?.message || 'Promise rejected',
        });
        totalFailed++;
      }
    }

    const totalDurationMs = Date.now() - startTime;

    this.logger.log(`✅ Fetch complete in ${totalDurationMs}ms`);
    this.logger.log(`   Success: ${totalSuccess}/${RSS_SOURCES.length}`);
    this.logger.log(`   Failed:  ${totalFailed}/${RSS_SOURCES.length}`);
    this.logger.log(`   Articles: ${all.length} total (before dedupe)`);

    // Group by publisher for stats
    const byPublisher = new Map<string, { success: number; failed: number; articles: number }>();
    for (const s of sourceStatus) {
      if (!byPublisher.has(s.publisher)) {
        byPublisher.set(s.publisher, { success: 0, failed: 0, articles: 0 });
      }
      const p = byPublisher.get(s.publisher)!;
      if (s.success) p.success++;
      else p.failed++;
      p.articles += s.count;
    }
    byPublisher.forEach((stats, pub) => {
      const icon = stats.failed === 0 ? '✅' : stats.success === 0 ? '❌' : '⚠️';
      this.logger.log(
        `   ${icon} ${pub}: ${stats.success}✓ ${stats.failed}✗ → ${stats.articles} articles`,
      );
    });

    if (totalFailed > 0) {
      this.logger.warn(`Failed feeds detail:`);
      sourceStatus
        .filter((s) => !s.success)
        .forEach((s) => {
          this.logger.warn(`    ${s.feedId}: ${s.error} (${s.durationMs}ms)`);
        });
    }

    // Dedupe + sort by date (newest first)
    const deduped = this.dedupe(all);
    deduped.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    const result: FetchAllResult = {
      articles: deduped,
      sourceStatus,
      fetchedAt: new Date().toISOString(),
      totalSuccess,
      totalFailed,
      totalDurationMs,
    };

    this.cache = { result, fetchedAt: Date.now() };
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 RSS FETCH — with optional proxy support
  // ═══════════════════════════════════════════════════════════════════
  private async fetchRss(source: FeedSource, timeoutMs: number): Promise<FetchInternalResult> {
    const start = Date.now();

    if (!source.feedUrl) {
      return {
        source,
        articles: [],
        success: false,
        durationMs: 0,
        error: 'No feed URL configured',
      };
    }

    const proxyBase = this.configService.get<string>('RSS_PROXY_URL');
    const proxySecret = this.configService.get<string>('RSS_PROXY_SECRET');
    const useProxy = !!proxyBase;

    try {
      if (useProxy) {
        return await this.fetchRssViaProxy(source, timeoutMs, proxyBase, proxySecret, start);
      }
      return await this.fetchRssDirect(source, timeoutMs, start);
    } catch (e) {
      const durationMs = Date.now() - start;
      const message = (e as Error).message || 'Unknown error';
      const name = (e as Error).name || 'Error';

      this.logger.warn(`⚠️  ${source.feedId} threw ${name}: ${message} after ${durationMs}ms`);

      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: `${name}: ${message}`,
      };
    }
  }

  // Direct RSS fetch (no proxy)
  private async fetchRssDirect(
    source: FeedSource,
    timeoutMs: number,
    start: number,
  ): Promise<FetchInternalResult> {
    this.logger.log(`→ Direct fetch: ${source.feedId} (${source.feedUrl})`);

    const res = await fetch(source.feedUrl!, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      this.logger.warn(`⚠️  ${source.feedId} HTTP ${res.status} after ${durationMs}ms`);
      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: `HTTP ${res.status} ${res.statusText}`,
        status: res.status,
      };
    }

    const xml = await res.text();
    const sizeKb = (xml.length / 1024).toFixed(1);

    if (!xml.includes('<item') && !xml.includes('<entry')) {
      this.logger.warn(
        `⚠️  ${source.feedId}: response has no <item> tags (got ${sizeKb}KB, looks invalid)`,
      );
      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: `Invalid feed (no items found, got ${sizeKb}KB)`,
      };
    }

    const articles = this.parseRssXml(xml, source);
    this.logger.log(`✓ ${source.feedId}: ${articles.length} articles, ${sizeKb}KB in ${durationMs}ms`);

    return { source, articles, success: true, durationMs };
  }

  // RSS fetch via proxy (for sources that block direct access)
  private async fetchRssViaProxy(
    source: FeedSource,
    timeoutMs: number,
    proxyBase: string,
    proxySecret: string | undefined,
    start: number,
  ): Promise<FetchInternalResult> {
    const proxyUrl = new URL(`${proxyBase.replace(/\/$/, '')}/api/feed-proxy`);
    proxyUrl.searchParams.set('url', source.feedUrl!);
    if (proxySecret) proxyUrl.searchParams.set('key', proxySecret);

    this.logger.log(`→ Proxy fetch: ${source.feedId} via ${proxyBase}`);

    const res = await fetch(proxyUrl.toString(), {
      method: 'GET',
      headers: proxySecret ? { 'x-proxy-key': proxySecret } : {},
      signal: AbortSignal.timeout(timeoutMs),
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      this.logger.warn(`⚠️  ${source.feedId} proxy HTTP ${res.status} after ${durationMs}ms`);
      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: `Proxy HTTP ${res.status}`,
        status: res.status,
      };
    }

    const json = await res.json();

    if (!json.success || !json.xml) {
      this.logger.warn(
        `⚠️  ${source.feedId} proxy returned no XML: ${json.error || 'unknown'}`,
      );
      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: json.error || 'Proxy returned no XML',
        status: json.status,
      };
    }

    const xml = json.xml as string;
    const sizeKb = (xml.length / 1024).toFixed(1);

    if (!xml.includes('<item') && !xml.includes('<entry')) {
      this.logger.warn(`⚠️  ${source.feedId}: response has no <item> tags (${sizeKb}KB)`);
      return {
        source,
        articles: [],
        success: false,
        durationMs,
        error: `Invalid feed (no items, got ${sizeKb}KB)`,
      };
    }

    const articles = this.parseRssXml(xml, source);
    this.logger.log(
      `✓ ${source.feedId}: ${articles.length} articles, ${sizeKb}KB in ${durationMs}ms (via proxy)`,
    );

    return { source, articles, success: true, durationMs };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 MARKETAUX API FETCH
  // ═══════════════════════════════════════════════════════════════════
  private async fetchMarketaux(
    source: FeedSource,
    timeoutMs: number,
    page: number = 1,
  ): Promise<FetchInternalResult> {
    const start = Date.now();
    const apiKey = this.configService.get<string>('MARKETAUX_API_KEY');

    if (!apiKey) {
      this.logger.error(`❌ MARKETAUX_API_KEY environment variable not set!`);
      return {
        source,
        articles: [],
        success: false,
        durationMs: 0,
        error: 'MARKETAUX_API_KEY not configured',
      };
    }

    const searchTerm = source.search || source.industries;
    if (!searchTerm) {
      return {
        source,
        articles: [],
        success: false,
        durationMs: 0,
        error: 'No search/industries set',
      };
    }

    try {
      const params = new URLSearchParams({
        filter_entities: 'true',
        language: 'en',
        limit: '20',
        page: String(page),
        api_token: apiKey,
      });

      if (source.search) {
        params.set('search', source.search);
        this.logger.log(
          `→ Marketaux: ${source.feedId} (search="${source.search}", page=${page})`,
        );
      } else if (source.industries) {
        params.set('industries', source.industries);
        this.logger.log(
          `→ Marketaux: ${source.feedId} (industries=${source.industries}, page=${page})`,
        );
      }

      const url = `https://api.marketaux.com/v1/news/all?${params}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      const durationMs = Date.now() - start;

      if (!res.ok) {
        this.logger.warn(`⚠️  ${source.feedId} Marketaux HTTP ${res.status} after ${durationMs}ms`);
        return {
          source,
          articles: [],
          success: false,
          durationMs,
          error: `HTTP ${res.status}`,
          status: res.status,
        };
      }

      const json = await res.json();
      const items = json?.data || [];
      const found = json?.meta?.found || 0;

      const articles = items.map((item: any) => this.transformMarketauxItem(item, source));
      this.logger.log(
        `✓ ${source.feedId}: ${articles.length} articles in ${durationMs}ms (${found.toLocaleString()} found)`,
      );

      return { source, articles, success: true, durationMs, marketauxFound: found };
    } catch (e) {
      const durationMs = Date.now() - start;
      const message = (e as Error).message || 'Unknown error';
      this.logger.warn(`⚠️  ${source.feedId} Marketaux failed: ${message}`);
      return { source, articles: [], success: false, durationMs, error: message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 RSS XML PARSER (custom regex-based)
  // ═══════════════════════════════════════════════════════════════════
  private parseRssXml(xml: string, source: FeedSource): Article[] {
    const articles: Article[] = [];
    const itemMatches = xml.matchAll(/<item[\s\S]*?<\/item>/g);

    for (const match of itemMatches) {
      const itemXml = match[0];
      const title = this.extractTag(itemXml, 'title');
      const link = this.extractTag(itemXml, 'link');
      const description = this.extractTag(itemXml, 'description');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const guid = this.extractTag(itemXml, 'guid');
      const contentEncoded = this.extractTag(itemXml, 'content:encoded');
      const creator = this.extractTag(itemXml, 'dc:creator');

      if (!title) continue;

      const cleanDesc = this.cleanText(description || contentEncoded || '');
      const imageUrl = this.extractImage(itemXml, contentEncoded, description);
      const idStr = guid || link || `${source.feedId}-${title}`;

      articles.push({
        id: this.hashStringToNumber(idStr),
        title: this.cleanText(title),
        description: this.truncate(cleanDesc, 280),
        url: link || '#',
        urlToImage: imageUrl,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        sourceId: source.sourceId,
        sourceName: source.publisher,
        author: creator || null,
        category: source.category,
        queryTopic: source.queryTopic,
        content: cleanDesc || null,
      });
    }

    return articles;
  }

  private transformMarketauxItem(item: any, source: FeedSource): Article {
    return {
      id: this.hashStringToNumber(item.uuid || item.url || `${source.feedId}-${item.title}`),
      title: item.title || 'Untitled',
      description: this.truncate(item.snippet || item.description || '', 280),
      url: item.url || '#',
      urlToImage: item.image_url || null,
      publishedAt: item.published_at || new Date().toISOString(),
      sourceId: source.sourceId,
      sourceName: source.publisher,
      author: item.source || null,
      category: source.category,
      queryTopic: source.queryTopic,
      content: item.snippet || null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 HELPERS — XML parsing, text cleaning, dedup
  // ═══════════════════════════════════════════════════════════════════
  private extractTag(xml: string, tag: string): string {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cdataPattern = new RegExp(
      `<${escaped}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${escaped}>`,
      'i',
    );
    const normalPattern = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
    const cdataMatch = xml.match(cdataPattern);
    if (cdataMatch) return cdataMatch[1].trim();
    const normalMatch = xml.match(normalPattern);
    if (normalMatch) return normalMatch[1].trim();
    return '';
  }

  private extractImage(
    itemXml: string,
    contentEncoded: string,
    description: string,
  ): string | null {
    const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    if (mediaMatch && !this.isTrackingPixel(mediaMatch[1])) return mediaMatch[1];

    const enclosureMatch = itemXml.match(
      /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i,
    );
    if (enclosureMatch && !this.isTrackingPixel(enclosureMatch[1])) return enclosureMatch[1];

    const haystack = (contentEncoded || '') + ' ' + (description || '');
    const imgMatches = [...haystack.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    for (const m of imgMatches) {
      if (!this.isTrackingPixel(m[1])) return m[1];
    }
    return null;
  }

  private isTrackingPixel(url: string): boolean {
    if (/feedburner|feedsportal|doubleclick|googleads|pixel\.gif/i.test(url)) return true;
    if (/[?&](w|width|h|height)=1[&"']/i.test(url)) return true;
    return false;
  }

  private cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '…';
  }

  private hashStringToNumber(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
      hash = hash & 0xffffffff;
    }
    return Math.abs(hash);
  }

  private normalizeUrl(url: string): string {
    if (!url || url === '#') return '';
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase();
    }
  }

  private dedupe(articles: Article[]): Article[] {
    const seen = new Set<string>();
    const out: Article[] = [];
    for (const a of articles) {
      const key = this.normalizeUrl(a.url) || `id-${a.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 UTILITY: Group articles by source, take top N per source
  // Used by AI editor to limit articles sent to Claude (cost saving)
  // ═══════════════════════════════════════════════════════════════════
  groupBySourceWithLimit(articles: Article[], perSource: number = 3): Article[] {
    const grouped = new Map<string, Article[]>();

    for (const article of articles) {
      const key = article.sourceId + '|' + article.queryTopic;
      if (!grouped.has(key)) grouped.set(key, []);
      const arr = grouped.get(key)!;
      if (arr.length < perSource) arr.push(article);
    }

    const result: Article[] = [];
    grouped.forEach((arr) => result.push(...arr));

    this.logger.log(
      `📊 Grouped ${articles.length} → ${result.length} articles (top ${perSource} per source/topic, ${grouped.size} groups)`,
    );

    return result;
  }
}