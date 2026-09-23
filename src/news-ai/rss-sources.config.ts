export type FeedSourceType = 'rss' | 'marketaux';

export interface FeedSource {
  feedId: string;
  publisher: string;
  sourceId: string;
  category: string;
  queryTopic: string;
  type: FeedSourceType;
  feedUrl?: string;
  search?: string;
  industries?: string;
}

export const RSS_SOURCES: FeedSource[] = [
  // ── Hellenic Shipping News (11 categories) ──────────────────────────────
  { feedId: 'hellenic-top', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'Top Stories', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/tag/top-stories/feed/' },
  { feedId: 'hellenic-international', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'International Shipping', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/international-shipping-news/feed/' },
  { feedId: 'hellenic-drybulk', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'Dry Bulk Market', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/dry-bulk-market/feed/' },
  { feedId: 'hellenic-piracy', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'Piracy & Security', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/piracy-and-security-news/feed/' },
  { feedId: 'hellenic-port', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'Port News', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/port-news/feed/' },
  { feedId: 'hellenic-shipbuilding', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'shipping', queryTopic: 'Shipbuilding', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/shipbuilding-news/feed/' },
  { feedId: 'hellenic-oil', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'oil_gas', queryTopic: 'Oil & Companies', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/oil-companies-news/feed/' },
  { feedId: 'hellenic-energy', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'oil_gas', queryTopic: 'General Energy', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/general-energy-news/feed/' },
  { feedId: 'hellenic-economy', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'trading', queryTopic: 'World Economy', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/world-economy-news/feed/' },
  { feedId: 'hellenic-commodity', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'trading', queryTopic: 'Commodity News', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/commodity-news/feed/' },
  { feedId: 'hellenic-stock', publisher: 'Hellenic Shipping News', sourceId: 'hellenic-shipping-news', category: 'trading', queryTopic: 'Stock Market', type: 'rss', feedUrl: 'https://www.hellenicshippingnews.com/category/stock-market-news/feed/' },

  // ── World Grain (Trade) ─────────────────────────────────────────────────
  { feedId: 'world-grain-trade', publisher: 'World Grain', sourceId: 'world-grain', category: 'agriculture', queryTopic: 'Trade', type: 'rss', feedUrl: 'https://www.world-grain.com/rss/topic/1034-trade' },

  // ── Energy Connects ─────────────────────────────────────────────────────
  { feedId: 'energy-connects-all', publisher: 'Energy Connects', sourceId: 'energy-connects', category: 'oil_gas', queryTopic: 'General', type: 'rss', feedUrl: 'https://www.energyconnects.com/rss/' },

  // ── Ship & Bunker ───────────────────────────────────────────────────────
  { feedId: 'ship-bunker-all', publisher: 'Ship & Bunker', sourceId: 'ship-bunker', category: 'shipping', queryTopic: 'World', type: 'rss', feedUrl: 'https://shipandbunker.com/rss' },

  // ── Marketaux (5 client keywords) ──────────────────────────────────────
  { feedId: 'marketaux-crude-oil', publisher: 'Marketaux', sourceId: 'marketaux', category: 'oil_gas', queryTopic: 'Crude Oil & OPEC', type: 'marketaux', search: 'crude oil AND (Brent OR WTI OR prices OR OPEC)' },
  { feedId: 'marketaux-oil-supply', publisher: 'Marketaux', sourceId: 'marketaux', category: 'oil_gas', queryTopic: 'Oil Supply Chain', type: 'marketaux', search: 'oil AND (refinery OR sanctions OR pipeline OR exports OR production)' },
  { feedId: 'marketaux-middle-east', publisher: 'Marketaux', sourceId: 'marketaux', category: 'oil_gas', queryTopic: 'Middle East Energy', type: 'marketaux', search: 'Middle East AND (oil OR crude OR energy OR supply)' },
  { feedId: 'marketaux-oil-demand', publisher: 'Marketaux', sourceId: 'marketaux', category: 'oil_gas', queryTopic: 'Oil Demand & Inventory', type: 'marketaux', search: 'oil AND (demand OR inventory OR stockpiles OR IEA OR EIA)' },
  { feedId: 'marketaux-geopolitics', publisher: 'Marketaux', sourceId: 'marketaux', category: 'oil_gas', queryTopic: 'Geopolitics', type: 'marketaux', search: 'geopolitics AND (oil OR crude OR sanctions OR supply disruption)' },
];

export interface Article {
  id: number;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  sourceId: string | null;
  sourceName: string | null;
  author: string | null;
  category: string | null;
  queryTopic: string | null;
  content: string | null;
}

export interface SourceStatus {
  feedId: string;
  publisher: string;
  sourceId: string;
  queryTopic: string;
  success: boolean;
  count: number;
  durationMs: number;
  error?: string;
  status?: number;
  marketauxFound?: number;
}

export interface FetchAllResult {
  articles: Article[];
  sourceStatus: SourceStatus[];
  fetchedAt: string;
  totalSuccess: number;
  totalFailed: number;
  totalDurationMs: number;
}