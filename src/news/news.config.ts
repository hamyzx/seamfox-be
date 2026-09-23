// ════════════════════════════════════════════════════════════════════
// PRIORITY SOURCES — verify IDs at:
// https://newsapi.org/v2/top-headlines/sources?apiKey=YOUR_API_KEY
// ════════════════════════════════════════════════════════════════════
export const NEWS_SOURCES = [
  'bloomberg',
  'the-wall-street-journal',
  'financial-post',
  'fortune',
  'business-insider',
];

// ════════════════════════════════════════════════════════════════════
// COMPOUND QUERIES — categorized for filtering
// ════════════════════════════════════════════════════════════════════
export interface CompoundQuery {
  topic: string;
  category:
    | 'oil_gas'
    | 'lng_natural_gas'
    | 'coal'
    | 'shipping'
    | 'metals'
    | 'agriculture'
    | 'fertilisers'
    | 'trading';
  query: string;
}

export const NEWS_QUERIES: CompoundQuery[] = [
  // ─── OIL & GAS ─────────────────────────────────
  { topic: 'crude_market', category: 'oil_gas', query: `"crude oil" AND (Brent OR WTI OR prices)` },
  { topic: 'opec_supply', category: 'oil_gas', query: `(OPEC OR OPEC+) AND (supply OR production OR cuts OR quota)` },
  { topic: 'refining', category: 'oil_gas', query: `(refinery OR refining) AND (margins OR runs OR utilization)` },
  { topic: 'fuel_products', category: 'oil_gas', query: `(diesel OR gasoline OR "jet fuel") AND (prices OR demand)` },
  { topic: 'oil_sanctions', category: 'oil_gas', query: `(oil sanctions OR Russia oil OR Iran oil) AND (exports OR flows)` },
  { topic: 'middle_east_oil', category: 'oil_gas', query: `(Hormuz OR "Middle East") AND (oil OR crude OR tankers)` },
  { topic: 'petrochemicals', category: 'oil_gas', query: `(naphtha OR methanol OR ethylene OR petrochemical) AND (prices OR supply)` },

  // ─── LNG / NATURAL GAS ─────────────────────────
  { topic: 'lng_market', category: 'lng_natural_gas', query: `(LNG OR "liquefied natural gas") AND (prices OR demand OR supply)` },
  { topic: 'lng_shipping', category: 'lng_natural_gas', query: `(LNG carriers OR LNG shipping) AND (rates OR cargoes OR fleet)` },
  { topic: 'europe_gas', category: 'lng_natural_gas', query: `(TTF OR "European gas") AND (prices OR storage OR demand)` },
  { topic: 'asia_lng', category: 'lng_natural_gas', query: `(JKM OR "Asian LNG") AND (demand OR prices OR cargoes)` },
  { topic: 'us_lng', category: 'lng_natural_gas', query: `(US LNG OR Henry Hub) AND (exports OR terminal OR supply)` },
  { topic: 'lng_terminals', category: 'lng_natural_gas', query: `(LNG terminal OR regasification OR liquefaction) AND (capacity OR project)` },

  // ─── COAL ──────────────────────────────────────
  { topic: 'thermal_coal', category: 'coal', query: `(thermal coal OR steam coal) AND (prices OR supply OR exports)` },
  { topic: 'met_coal', category: 'coal', query: `(metallurgical coal OR coking coal) AND (prices OR supply OR steel)` },
  { topic: 'coal_exports', category: 'coal', query: `(coal exports OR coal shipments) AND (Australia OR Indonesia OR Russia)` },
  { topic: 'coal_power', category: 'coal', query: `(coal power OR coal plant) AND (phase out OR closure OR demand)` },

  // ─── SHIPPING ──────────────────────────────────
  { topic: 'freight_broad', category: 'shipping', query: `(freight rates OR shipping rates) AND (commodities OR cargo)` },
  { topic: 'dry_bulk', category: 'shipping', query: `(dry bulk OR BDI OR "Baltic Dry") AND (rates OR vessels)` },
  { topic: 'tankers', category: 'shipping', query: `(tanker rates OR VLCC OR Suezmax OR Aframax) AND (crude OR oil)` },
  { topic: 'product_tankers', category: 'shipping', query: `("product tankers" OR "MR tankers") AND (diesel OR clean products)` },
  { topic: 'containers', category: 'shipping', query: `(container shipping OR container rates) AND (congestion OR delay OR TEU)` },
  { topic: 'war_risk', category: 'shipping', query: `(war risk OR maritime security) AND (shipping OR tankers)` },
  { topic: 'imo_green', category: 'shipping', query: `(IMO OR decarbonisation) AND (shipping OR vessels OR fuel)` },
  { topic: 'chartering', category: 'shipping', query: `(time charter OR voyage charter OR chartering) AND (vessels OR rates)` },

  // ─── METALS & MINING ───────────────────────────
  { topic: 'metals_broad', category: 'metals', query: `(base metals OR LME OR "metals market") AND (prices OR demand)` },
  { topic: 'iron_ore', category: 'metals', query: `"iron ore" AND (China OR steel OR prices OR shipments)` },
  { topic: 'copper', category: 'metals', query: `copper AND (prices OR demand OR supply OR inventories)` },
  { topic: 'aluminium', category: 'metals', query: `(aluminium OR aluminum) AND (prices OR smelter OR supply)` },
  { topic: 'nickel', category: 'metals', query: `nickel AND (prices OR Indonesia OR batteries OR supply)` },
  { topic: 'zinc', category: 'metals', query: `zinc AND (prices OR supply OR smelter OR mine)` },
  { topic: 'steel', category: 'metals', query: `steel AND (prices OR production OR HRC OR rebar OR demand)` },
  { topic: 'scrap', category: 'metals', query: `(scrap metal OR ferrous scrap) AND (prices OR supply OR EAF)` },
  { topic: 'mining_output', category: 'metals', query: `(mining output OR mine production) AND (copper OR nickel OR ore)` },

  // ─── AGRICULTURE ───────────────────────────────
  { topic: 'agri_broad', category: 'agriculture', query: `(agri commodities OR agriculture) AND (prices OR supply OR demand)` },
  { topic: 'wheat', category: 'agriculture', query: `wheat AND (prices OR crop OR exports OR harvest OR supply)` },
  { topic: 'corn', category: 'agriculture', query: `corn AND (prices OR crop OR exports OR ethanol OR demand)` },
  { topic: 'soybeans', category: 'agriculture', query: `soybeans AND (prices OR "China demand" OR exports OR crop)` },
  { topic: 'sugar', category: 'agriculture', query: `sugar AND (prices OR Brazil OR India OR exports OR ethanol)` },
  { topic: 'coffee', category: 'agriculture', query: `coffee AND (prices OR Brazil OR Vietnam OR Arabica OR Robusta)` },
  { topic: 'cocoa', category: 'agriculture', query: `cocoa AND (prices OR Ghana OR "Ivory Coast" OR crop OR supply)` },
  { topic: 'palm_oil', category: 'agriculture', query: `(palm oil OR CPO) AND (prices OR Malaysia OR Indonesia OR supply)` },
  { topic: 'cotton', category: 'agriculture', query: `cotton AND (prices OR crop OR exports OR India OR US)` },
  { topic: 'rice', category: 'agriculture', query: `rice AND (prices OR exports OR India OR Thailand OR supply)` },
  { topic: 'weather', category: 'agriculture', query: `(El Nino OR drought OR floods) AND (crops OR agriculture OR food)` },
  { topic: 'usda', category: 'agriculture', query: `(USDA OR crop report) AND (grains OR soybeans OR corn OR wheat)` },

  // ─── FERTILISERS ───────────────────────────────
  { topic: 'urea', category: 'fertilisers', query: `urea AND (prices OR supply OR exports OR demand OR India)` },
  { topic: 'ammonia', category: 'fertilisers', query: `ammonia AND (prices OR supply OR green OR blue OR trade)` },
  { topic: 'potash', category: 'fertilisers', query: `(potash OR MOP OR KCl) AND (prices OR supply OR Belarus OR Canada)` },
  { topic: 'dap_map', category: 'fertilisers', query: `(DAP OR MAP OR phosphate) AND (prices OR supply OR Morocco OR China)` },
  { topic: 'fert_broad', category: 'fertilisers', query: `(fertiliser OR fertilizer) AND (prices OR supply OR exports)` },

  // ─── TRADING LAYER ─────────────────────────────
  { topic: 'commodity_markets', category: 'trading', query: `"commodity markets" AND (prices OR trading OR volatility)` },
  { topic: 'global_trade', category: 'trading', query: `"global trade" AND (commodities OR shipping OR supply chain)` },
  { topic: 'inflation', category: 'trading', query: `inflation AND (commodities OR energy OR food prices)` },
  { topic: 'interest_rates', category: 'trading', query: `"interest rates" AND (commodities OR dollar OR demand)` },
  { topic: 'china_demand', category: 'trading', query: `"China economy" AND (commodities OR metals OR oil OR demand)` },
  { topic: 'india_demand', category: 'trading', query: `"India" AND (commodities OR steel OR oil OR food OR demand)` },
  { topic: 'geopolitics', category: 'trading', query: `(geopolitics OR sanctions OR trade war) AND (commodities OR energy)` },
  { topic: 'supply_chain', category: 'trading', query: `"supply chain" AND (commodities OR ports OR freight OR disruption)` },
];

// ════════════════════════════════════════════════════════════════════
// CRON CONFIG
// ════════════════════════════════════════════════════════════════════
export const NEWS_CRON_INTERVAL = '*/30 * * * *'; // every 30 minutes
export const MAX_ARTICLES_PER_QUERY = 10;
export const MAX_TOTAL_ARTICLES = 500; // rolling buffer cap
export const NEWS_API_URL = 'https://newsapi.org/v2/everything';