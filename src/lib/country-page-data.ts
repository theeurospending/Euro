// Server-side data loader for /country/[slug]. Fetches everything needed
// for the page in as few Supabase calls as possible (3 queries total).

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type CountryPageData = {
  country: {
    iso_code: string;
    name: string;
    slug: string;
    flag_emoji: string | null;
    joined_eu: string | null;
    joined_eurozone: string | null;
    capital: string | null;
    population_baseline: number | null;
    is_eu_member: boolean;
    is_eurozone_member: boolean;
  };
  narrative: {
    intro_html: string;
    fiscal_context_html: string;
    macro_context_html: string;
    current_situation_html: string;
    updated_at: string | null;
  };
  // Per-metric time series — sorted oldest-first.
  series: Record<string, { period_start: string; value: number; is_forecast: boolean }[]>;
  // Per-metric latest snapshot + YoY delta.
  snapshot: Record<string, { latest: { period_start: string; value: number } | null; yoy_delta_abs: number | null; yoy_delta_pct: number | null; spark: { value: number }[] }>;
  // Eurozone average overlays for selected metrics.
  ezAverage: Record<string, { period_start: string; value: number }[]>;
  // COFOG breakdown for latest year (one slice per category).
  cofog: { name: string; metric_key: string; value: number }[];
  // Sources used (deduplicated).
  sources: { source: string; latest_ingest: string | null }[];
};

const METRICS_FOR_PAGE = [
  // Snapshot row
  'gdp_nominal_eur_millions',
  'gdp_per_capita_eur',
  'gov_deficit_pct_gdp',
  'gov_debt_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
  // Fiscal trajectory
  'gov_expenditure_total_pct_gdp',
  'gov_revenue_total_pct_gdp',
  // COFOG donut
  'gov_expenditure_health_pct_gdp',
  'gov_expenditure_education_pct_gdp',
  'gov_expenditure_defence_pct_gdp',
  'gov_expenditure_social_protection_pct_gdp',
  // Macro
  'gdp_real_growth_pct',
  // Markets
  'sovereign_10y_yield',
  // Forecasts
  'imf_gdp_growth_forecast_pct',
  'imf_gross_debt_forecast_pct_gdp',
  'imf_net_lending_forecast_pct_gdp',
];

const COFOG_METRICS = [
  { key: 'gov_expenditure_health_pct_gdp',            label: 'Health' },
  { key: 'gov_expenditure_education_pct_gdp',         label: 'Education' },
  { key: 'gov_expenditure_defence_pct_gdp',           label: 'Defence' },
  { key: 'gov_expenditure_social_protection_pct_gdp', label: 'Social protection' },
];

const EZ_AVG_METRICS = [
  'gov_debt_pct_gdp',
  'gov_deficit_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
];

export async function loadCountryPageData(slug: string): Promise<CountryPageData | null> {
  const admin = createSupabaseAdminClient();

  // 1. Country row.
  const { data: country } = await admin
    .from('countries')
    .select('iso_code, name, slug, flag_emoji, joined_eu, joined_eurozone, capital, population_baseline, is_eu_member, is_eurozone_member')
    .eq('slug', slug)
    .maybeSingle();
  if (!country) return null;

  // 2. Narrative — table may not yet exist if Session 5 migration 013 hasn't been run.
  let narrativeRow: { intro_html: string; fiscal_context_html: string; macro_context_html: string; current_situation_html: string; updated_at: string } | null = null;
  try {
    const r = await admin
      .from('country_narratives')
      .select('intro_html, fiscal_context_html, macro_context_html, current_situation_html, updated_at')
      .eq('country_iso', country.iso_code)
      .maybeSingle();
    narrativeRow = r.data ?? null;
  } catch {
    narrativeRow = null;
  }

  // 3. All country data points + eurozone overlay data points + ingest timestamps in parallel.
  const [countryRowsRes, ezRowsRes, sourcesRes] = await Promise.all([
    admin
      .from('economic_data_points')
      .select('metric_key, period_start, value, source, is_forecast')
      .eq('country_iso', country.iso_code)
      .in('metric_key', METRICS_FOR_PAGE)
      .order('period_start', { ascending: true }),
    admin
      .from('economic_data_points')
      .select('metric_key, period_start, value')
      .eq('country_iso', 'EZ')
      .in('metric_key', EZ_AVG_METRICS)
      .order('period_start', { ascending: true }),
    admin
      .from('data_sources')
      .select('source_name, last_run_finished_at'),
  ]);

  const series: CountryPageData['series'] = {};
  for (const m of METRICS_FOR_PAGE) series[m] = [];
  const usedSources = new Set<string>();
  for (const r of countryRowsRes.data ?? []) {
    series[r.metric_key]?.push({ period_start: r.period_start, value: Number(r.value), is_forecast: r.is_forecast });
    if (r.source) usedSources.add(r.source);
  }

  // Build snapshot per metric.
  const snapshot: CountryPageData['snapshot'] = {};
  for (const m of METRICS_FOR_PAGE) {
    const arr = series[m];
    if (!arr || arr.length === 0) {
      snapshot[m] = { latest: null, yoy_delta_abs: null, yoy_delta_pct: null, spark: [] };
      continue;
    }
    // Exclude forecasts for "latest" snapshot.
    const historical = arr.filter((p) => !p.is_forecast);
    const latest = historical.at(-1) ?? arr.at(-1)!;
    const prior = historical.at(-2);
    const yoy_delta_abs = prior ? latest.value - prior.value : null;
    const yoy_delta_pct = prior && prior.value !== 0 ? (latest.value - prior.value) / Math.abs(prior.value) : null;
    snapshot[m] = {
      latest: { period_start: latest.period_start, value: latest.value },
      yoy_delta_abs,
      yoy_delta_pct,
      spark: arr.slice(-12).map((p) => ({ value: p.value })),
    };
  }

  // Eurozone overlays.
  const ezAverage: CountryPageData['ezAverage'] = {};
  for (const m of EZ_AVG_METRICS) ezAverage[m] = [];
  for (const r of ezRowsRes.data ?? []) {
    ezAverage[r.metric_key]?.push({ period_start: r.period_start, value: Number(r.value) });
  }

  // COFOG breakdown — pick the latest year that has at least one COFOG metric.
  const cofog: CountryPageData['cofog'] = [];
  let latestCofogYear: string | null = null;
  for (const c of COFOG_METRICS) {
    const latest = series[c.key]?.filter((p) => !p.is_forecast).at(-1);
    if (latest && (!latestCofogYear || latest.period_start > latestCofogYear)) latestCofogYear = latest.period_start;
  }
  if (latestCofogYear) {
    for (const c of COFOG_METRICS) {
      const at = series[c.key]?.find((p) => p.period_start === latestCofogYear);
      if (at) cofog.push({ name: c.label, metric_key: c.key, value: at.value });
    }
    // "Other" slice = total expenditure minus the four categories above.
    const totalExp = series['gov_expenditure_total_pct_gdp']?.find((p) => p.period_start === latestCofogYear)?.value;
    if (typeof totalExp === 'number') {
      const accounted = cofog.reduce((s, c) => s + c.value, 0);
      const other = Math.max(0, totalExp - accounted);
      if (other > 0.1) cofog.push({ name: 'Other', metric_key: 'gov_expenditure_other_pct_gdp', value: other });
    }
  }

  // Sources used + last ingest dates.
  const sourceTimestamps = new Map<string, string | null>();
  for (const s of sourcesRes.data ?? []) sourceTimestamps.set(s.source_name, s.last_run_finished_at);
  const sources = [...usedSources].sort().map((s) => ({
    source: s,
    latest_ingest: sourceTimestamps.get(s) ?? null,
  }));

  return {
    country,
    narrative: {
      intro_html:              narrativeRow?.intro_html              ?? '',
      fiscal_context_html:     narrativeRow?.fiscal_context_html     ?? '',
      macro_context_html:      narrativeRow?.macro_context_html      ?? '',
      current_situation_html:  narrativeRow?.current_situation_html  ?? '',
      updated_at:              narrativeRow?.updated_at              ?? null,
    },
    series,
    snapshot,
    ezAverage,
    cofog,
    sources,
  };
}

/** Compute country's percentile rank among EU peers for the latest period. */
export async function loadPeerPercentiles(country_iso: string, metric_keys: string[]):
  Promise<Record<string, { rank: number; total: number; value: number; percentile: number }>> {
  const admin = createSupabaseAdminClient();
  const out: Record<string, { rank: number; total: number; value: number; percentile: number }> = {};

  for (const metric of metric_keys) {
    // Latest period observed for this metric — most-recent date across all EU members.
    const { data: latestPeriodRow } = await admin
      .from('economic_data_points')
      .select('period_start')
      .eq('metric_key', metric)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestPeriodRow) continue;

    // All EU country values at that period.
    const { data: allRows } = await admin
      .from('economic_data_points')
      .select('country_iso, value')
      .eq('metric_key', metric)
      .eq('period_start', latestPeriodRow.period_start)
      .in('country_iso',
        ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);
    if (!allRows || allRows.length === 0) continue;

    const sorted = allRows.map((r) => ({ iso: r.country_iso, v: Number(r.value) })).sort((a, b) => b.v - a.v);
    const idx = sorted.findIndex((r) => r.iso === country_iso);
    if (idx < 0) continue;
    out[metric] = {
      rank: idx + 1,
      total: sorted.length,
      value: sorted[idx].v,
      percentile: Math.round(((sorted.length - idx) / sorted.length) * 100),
    };
  }
  return out;
}
