// One-shot fetch of every EU country's latest snapshot for use on the
// homepage map + tile grid.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type HomepageMetric =
  | 'gov_debt_pct_gdp'
  | 'gov_deficit_pct_gdp'
  | 'gdp_real_growth_pct'
  | 'hicp_annual_pct'
  | 'hicp_core_annual_pct'
  | 'unemployment_rate_pct'
  | 'gdp_per_capita_eur'
  | 'housing_cost_overburden_pct'
  | 'net_migration_rate'
  | 'population_change_rate';

export const HOMEPAGE_METRIC_LABELS: Record<HomepageMetric, { label: string; unit: string; betterDirection: 'low' | 'high' }> = {
  gov_debt_pct_gdp:            { label: 'Debt',            unit: '% GDP',    betterDirection: 'low'  },
  gov_deficit_pct_gdp:         { label: 'Deficit',         unit: '% GDP',    betterDirection: 'high' },
  gdp_real_growth_pct:         { label: 'GDP growth',      unit: '%',        betterDirection: 'high' },
  hicp_annual_pct:             { label: 'Inflation',       unit: '%',        betterDirection: 'low'  },
  hicp_core_annual_pct:        { label: 'Real inflation',  unit: '%',        betterDirection: 'low'  },
  unemployment_rate_pct:       { label: 'Unemployment',    unit: '%',        betterDirection: 'low'  },
  gdp_per_capita_eur:          { label: 'GDP per cap',     unit: '€',        betterDirection: 'high' },
  housing_cost_overburden_pct: { label: 'Housing burden',  unit: '%',        betterDirection: 'low'  },
  net_migration_rate:          { label: 'Net migration',   unit: '/1,000',   betterDirection: 'high' },
  population_change_rate:       { label: 'Pop. change',     unit: '/1,000',   betterDirection: 'high' },
};

// Traffic-light status for a metric value. Indicative bands anchored on the
// reference points in the "benchmarks-and-thresholds" explainer (Maastricht
// 3%/60%, ECB 2% target) — meant as a quick read, not an official judgement.
export type MetricStatus = 'ok' | 'risky' | 'bad';

export function metricStatus(metric: HomepageMetric, v: number): MetricStatus | null {
  switch (metric) {
    case 'gov_debt_pct_gdp':            return v <= 60   ? 'ok' : v <= 90 ? 'risky' : 'bad';
    case 'gov_deficit_pct_gdp':         return v >= -3   ? 'ok' : v >= -6 ? 'risky' : 'bad';
    case 'gdp_real_growth_pct':         return v >= 2    ? 'ok' : v >= 0  ? 'risky' : 'bad';
    case 'hicp_annual_pct':
    case 'hicp_core_annual_pct':        return v <= 2.5  ? 'ok' : v <= 4  ? 'risky' : 'bad';
    case 'unemployment_rate_pct':       return v < 5     ? 'ok' : v < 9   ? 'risky' : 'bad';
    case 'gdp_per_capita_eur':          return v >= 40000 ? 'ok' : v >= 25000 ? 'risky' : 'bad';
    case 'housing_cost_overburden_pct': return v < 8     ? 'ok' : v <= 15 ? 'risky' : 'bad';
    default: return null;
  }
}

export type CountrySnapshot = {
  iso_code: string;
  name: string;
  slug: string;
  flag_emoji: string | null;
  is_eu_member: boolean;
  is_eurozone_member: boolean;
  is_aggregate: boolean;
  display_order: number;
  // Per-metric latest value (historical, excluding forecasts).
  metrics: Partial<Record<HomepageMetric, { period_start: string; value: number; spark: { period: string; value: number }[]; yoy_delta_abs: number | null }>>;
};

export type HomepageData = {
  countries: CountrySnapshot[];
  euroSnapshot: {
    ecb_main_refi_rate: { period_start: string; value: number } | null;
    eurozone_hicp_headline: { period_start: string; value: number } | null;
    eur_usd_rate: { period_start: string; value: number } | null;
    latestEvent: { event_date: string; title: string; category: string; description: string | null } | null;
  };
};

const ALL_METRICS: HomepageMetric[] = [
  'gov_debt_pct_gdp',
  'gov_deficit_pct_gdp',
  'gdp_real_growth_pct',
  'hicp_annual_pct',
  'hicp_core_annual_pct',
  'unemployment_rate_pct',
  'gdp_per_capita_eur',
  'housing_cost_overburden_pct',
  'net_migration_rate',
  'population_change_rate',
];

export async function loadHomepageData(): Promise<HomepageData> {
  const admin = createSupabaseAdminClient();

  // 1. All non-aggregate countries.
  const { data: countries } = await admin
    .from('countries')
    .select('iso_code, name, slug, flag_emoji, is_eu_member, is_eurozone_member, is_aggregate, display_order')
    .eq('is_aggregate', false)
    .order('display_order');

  // 2. Per-country data points for the 6 homepage metrics.
  //    We pull recent 24 months for sparklines AND the latest annual value.
  //    Bounded query: limit to last ~36 months of period_starts to cap rows.
  const sinceCutoff = new Date();
  sinceCutoff.setUTCFullYear(sinceCutoff.getUTCFullYear() - 4);
  const sinceIso = sinceCutoff.toISOString().slice(0, 10);

  const { data: countryRows } = await admin
    .from('economic_data_points')
    .select('country_iso, metric_key, period_start, value, is_forecast')
    .in('metric_key', ALL_METRICS)
    .gte('period_start', sinceIso)
    .eq('is_forecast', false)
    .order('period_start', { ascending: true });

  // Group rows by (country, metric) → ordered list.
  const byCountryMetric = new Map<string, { period_start: string; value: number }[]>();
  for (const r of countryRows ?? []) {
    const k = `${r.country_iso}|${r.metric_key}`;
    const arr = byCountryMetric.get(k) ?? [];
    arr.push({ period_start: r.period_start, value: Number(r.value) });
    byCountryMetric.set(k, arr);
  }

  // 3. Euro snapshot panel: most-recent ECB rate, HICP, EUR/USD, latest event.
  const [refiRes, hicpRes, fxRes, eventRes] = await Promise.all([
    admin.from('economic_data_points').select('period_start, value').eq('country_iso', 'EZ').eq('metric_key', 'ecb_main_refi_rate').order('period_start', { ascending: false }).limit(1).maybeSingle(),
    admin.from('economic_data_points').select('period_start, value').eq('country_iso', 'EZ').eq('metric_key', 'eurozone_hicp_headline').order('period_start', { ascending: false }).limit(1).maybeSingle(),
    admin.from('economic_data_points').select('period_start, value').eq('country_iso', 'EZ').eq('metric_key', 'eur_usd_rate').order('period_start', { ascending: false }).limit(1).maybeSingle(),
    admin.from('monetary_events').select('event_date, title, category, description').order('event_date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const enriched: CountrySnapshot[] = (countries ?? []).map((c) => {
    const metrics: CountrySnapshot['metrics'] = {};
    for (const m of ALL_METRICS) {
      const arr = byCountryMetric.get(`${c.iso_code}|${m}`);
      if (!arr || arr.length === 0) continue;
      const latest = arr[arr.length - 1];
      const prior = arr[arr.length - 2];
      const yoy_delta_abs = prior ? latest.value - prior.value : null;
      metrics[m] = {
        period_start: latest.period_start,
        value: latest.value,
        yoy_delta_abs,
        spark: arr.slice(-12).map((p) => ({ period: p.period_start, value: p.value })),
      };
    }
    return { ...c, metrics };
  });

  return {
    countries: enriched,
    euroSnapshot: {
      ecb_main_refi_rate:     refiRes.data ? { period_start: refiRes.data.period_start, value: Number(refiRes.data.value) } : null,
      eurozone_hicp_headline: hicpRes.data ? { period_start: hicpRes.data.period_start, value: Number(hicpRes.data.value) } : null,
      eur_usd_rate:           fxRes.data   ? { period_start: fxRes.data.period_start,   value: Number(fxRes.data.value) } : null,
      latestEvent: eventRes.data ?? null,
    },
  };
}
