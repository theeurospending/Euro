// Pure fact-detector. Pulls recent economic data and monetary events,
// runs each rule, returns deduped candidate facts sorted by priority.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { CandidateFact, SeriesIndex } from '@/lib/social/types';
import { detectThresholdCrossings } from './rules/threshold-crossing';
import { detectMultiYearExtremes } from './rules/multi-year-extreme';
import { detectRankChanges } from './rules/rank-change';
import { detectStreaks } from './rules/streak';
import { detectAnniversaries } from './rules/anniversary';

const EU27 = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

const METRICS_FOR_DETECTION = [
  'gov_deficit_pct_gdp',
  'gov_debt_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
  'gdp_real_growth_pct',
  'sovereign_10y_yield',
];

export async function detectFacts(): Promise<CandidateFact[]> {
  const admin = createSupabaseAdminClient();

  // Pull last ~30 data points per (country, metric) — enough for streak / multi-year window.
  const sinceCutoff = new Date();
  sinceCutoff.setUTCFullYear(sinceCutoff.getUTCFullYear() - 30);
  const sinceIso = sinceCutoff.toISOString().slice(0, 10);

  const [pointsRes, eventsRes] = await Promise.all([
    admin.from('economic_data_points')
      .select('country_iso, metric_key, period_start, value, is_forecast')
      .in('country_iso', EU27)
      .in('metric_key', METRICS_FOR_DETECTION)
      .eq('is_forecast', false)
      .gte('period_start', sinceIso)
      .order('period_start', { ascending: true }),
    admin.from('monetary_events').select('id, event_date, category, title, description').order('event_date'),
  ]);

  const series: SeriesIndex = new Map();
  for (const r of pointsRes.data ?? []) {
    const k = `${r.country_iso}|${r.metric_key}`;
    const arr = series.get(k) ?? [];
    arr.push({ period_start: r.period_start, value: Number(r.value) });
    series.set(k, arr);
  }

  const all: CandidateFact[] = [
    ...detectThresholdCrossings(series, EU27),
    ...detectMultiYearExtremes(series, EU27),
    ...detectRankChanges(series),
    ...detectStreaks(series, EU27),
    ...detectAnniversaries(eventsRes.data ?? []),
  ];

  // Dedupe by (rule, country_iso, metric, period).
  const dedupe = new Map<string, CandidateFact>();
  for (const f of all) {
    const k = `${f.rule_name}|${f.country_iso ?? ''}|${(f.supporting_data.metric ?? '')}|${(f.supporting_data.period ?? '')}`;
    const existing = dedupe.get(k);
    if (!existing || f.priority_score > existing.priority_score) dedupe.set(k, f);
  }

  return [...dedupe.values()].sort((a, b) => b.priority_score - a.priority_score);
}
