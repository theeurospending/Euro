// Asset-price extractor: gold and Bitcoin in euro.
//
// These sit OUTSIDE the Eurostat/ECB/IMF rule by design (there is no official
// EU source for a gold or BTC price). We use Stooq's free, no-key, deterministic
// daily CSV endpoint and store the closing price. Network policy must allow
// outbound requests to stooq.com.
//
// CSV shape: Date,Open,High,Low,Close,Volume  (one row per trading day)

import type { ExtractedRow } from '@/lib/extractors/eurostat';

const STOOQ = 'https://stooq.com/q/d/l/';

// Stored against the eurozone aggregate ('EZ') since these are euro-denominated
// reference prices, not country statistics.
const SYMBOLS: Array<{ symbol: string; metric_key: string; unit: string }> = [
  { symbol: 'xaueur', metric_key: 'gold_eur', unit: 'EUR per troy ounce' },
  { symbol: 'btceur', metric_key: 'btc_eur', unit: 'EUR' },
];

export type PricesExtractorOpts = { sinceYear?: number };

export async function prices_stooq(opts: PricesExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? 1999;
  const out: ExtractedRow[] = [];

  for (const s of SYMBOLS) {
    const url = `${STOOQ}?s=${s.symbol}&i=d`;
    const res = await fetch(url, {
      headers: { 'user-agent': 'eurospending.org/1.0 (+https://eurospending.org)' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`stooq ${s.symbol} HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error(`stooq ${s.symbol}: no data (${text.slice(0, 80)})`);

    const cols = lines[0].toLowerCase().split(',');
    const dateIdx = cols.indexOf('date');
    const closeIdx = cols.indexOf('close');
    if (dateIdx < 0 || closeIdx < 0) throw new Error(`stooq ${s.symbol}: unexpected header "${lines[0]}"`);

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      const date = parts[dateIdx];
      const close = Number(parts[closeIdx]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!Number.isFinite(close) || close <= 0) continue;
      if (parseInt(date.slice(0, 4), 10) < since) continue;
      out.push({
        country_iso: 'EZ',
        metric_key: s.metric_key,
        period_start: date,
        value: close,
        unit: s.unit,
        source: `stooq:${s.symbol}`,
      });
    }
  }

  return out;
}

export const PRICES_EXTRACTORS = { prices_stooq } as const;
export type PricesExtractorName = keyof typeof PRICES_EXTRACTORS;
