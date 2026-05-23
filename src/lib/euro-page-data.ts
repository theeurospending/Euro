import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAll } from '@/lib/supabase/paginate';

const EUROZONE_PERIPHERALS = ['IT', 'ES', 'GR', 'PT', 'IE'];

export type RegionSeries = {
  metric_key: string;
  label: string;
  unit: string;
  format: 'pct1' | 'int' | 'plain';
  series: { region: string; label: string; data: SeriesPoint[] }[];
};

export type EuroPageData = {
  events: MonetaryEvent[];
  ecbRate: SeriesPoint[];
  balanceSheet: SeriesPoint[];
  m2: SeriesPoint[];
  eurUsd: SeriesPoint[];
  hicpHeadline: SeriesPoint[];
  hicpCore: SeriesPoint[];
  sovereignYields: { country_iso: string; country_name: string; data: SeriesPoint[] }[];
  // Debasement additions
  goldEur: SeriesPoint[];
  btcEur: SeriesPoint[];
  m3PerPerson: SeriesPoint[];
  ezPopulation: number | null;
  cumulativeInflation: SeriesPoint[];   // index, base year = 100
  inflationBaseYear: number | null;
  // Regions tab
  regions: RegionSeries[];
};

const REGION_LABELS: Record<string, string> = {
  EZ: 'Eurozone', US: 'United States', CN: 'China', IN: 'India', JP: 'Japan',
};
const REGION_ORDER = ['EZ', 'US', 'CN', 'IN', 'JP'];
const REGION_METRICS: { metric_key: string; label: string; unit: string; format: 'pct1' | 'int' | 'plain' }[] = [
  { metric_key: 'imf_gdp_growth_forecast_pct',      label: 'Real GDP growth',       unit: '% YoY',    format: 'pct1' },
  { metric_key: 'imf_inflation_forecast_pct',       label: 'Inflation',             unit: '%',        format: 'pct1' },
  { metric_key: 'imf_gross_debt_forecast_pct_gdp',  label: 'Government debt',        unit: '% of GDP', format: 'pct1' },
  { metric_key: 'imf_net_lending_forecast_pct_gdp', label: 'Deficit / surplus',     unit: '% of GDP', format: 'pct1' },
];

export type MonetaryEvent = {
  id: number;
  event_date: string;
  category: string;
  title: string;
  description: string | null;
  impact_summary: string | null;
  related_metric_keys: string[];
  source_url: string | null;
};

export type SeriesPoint = { period_start: string; value: number };

export async function loadEuroPageData(): Promise<EuroPageData> {
  const admin = createSupabaseAdminClient();

  // Optimization: pull all needed series in two combined queries.
  const yieldsCountries = ['DE', ...EUROZONE_PERIPHERALS];
  const ezMetrics = [
    'ecb_main_refi_rate', 'ecb_balance_sheet_total', 'm2_eurozone', 'm3_eurozone',
    'eur_usd_rate', 'eurozone_hicp_headline', 'eurozone_hicp_core', 'gold_eur', 'btc_eur',
  ];

  const [eventsRes, ezRows, yieldRows, countriesRes, regionRows, ezPop] = await Promise.all([
    admin.from('monetary_events').select('*').order('event_date', { ascending: true }),
    fetchAll<{ metric_key: string; period_start: string; value: number }>((from, to) =>
      admin.from('economic_data_points')
        .select('metric_key, period_start, value')
        .eq('country_iso', 'EZ')
        .in('metric_key', ezMetrics)
        .order('period_start', { ascending: true })
        .range(from, to)
    ),
    fetchAll<{ country_iso: string; period_start: string; value: number }>((from, to) =>
      admin.from('economic_data_points')
        .select('country_iso, period_start, value')
        .eq('metric_key', 'sovereign_10y_yield')
        .in('country_iso', yieldsCountries)
        .order('period_start', { ascending: true })
        .range(from, to)
    ),
    admin.from('countries').select('iso_code, name').in('iso_code', yieldsCountries),
    fetchAll<{ country_iso: string; metric_key: string; period_start: string; value: number }>((from, to) =>
      admin.from('economic_data_points')
        .select('country_iso, metric_key, period_start, value')
        .in('country_iso', REGION_ORDER)
        .in('metric_key', REGION_METRICS.map((m) => m.metric_key))
        .order('period_start', { ascending: true })
        .range(from, to)
    ),
    eurozonePopulation(admin),
  ]);

  const ezByMetric = new Map<string, SeriesPoint[]>();
  for (const m of ezMetrics) ezByMetric.set(m, []);
  for (const r of ezRows) {
    ezByMetric.get(r.metric_key)?.push({ period_start: r.period_start, value: Number(r.value) });
  }

  const yieldsByCountry = new Map<string, SeriesPoint[]>();
  for (const r of yieldRows) {
    const arr = yieldsByCountry.get(r.country_iso) ?? [];
    arr.push({ period_start: r.period_start, value: Number(r.value) });
    yieldsByCountry.set(r.country_iso, arr);
  }

  const namesMap = new Map((countriesRes.data ?? []).map((c) => [c.iso_code, c.name]));

  const sovereignYields = yieldsCountries.map((iso) => ({
    country_iso: iso,
    country_name: namesMap.get(iso) ?? iso,
    data: yieldsByCountry.get(iso) ?? [],
  }));

  // ---- Derived: money supply per person ----
  const m3 = ezByMetric.get('m3_eurozone') ?? [];
  const m3PerPerson = ezPop && ezPop > 0
    ? m3.map((p) => ({ period_start: p.period_start, value: (p.value * 1_000_000) / ezPop }))
    : [];

  // ---- Derived: cumulative inflation index from the eurozone headline rate ----
  const { series: cumulativeInflation, baseYear: inflationBaseYear } =
    cumulativeIndexFromAnnualRate(ezByMetric.get('eurozone_hicp_headline') ?? []);

  // ---- Regions tab ----
  const regionByKeyCountry = new Map<string, SeriesPoint[]>();
  for (const r of regionRows) {
    const k = `${r.metric_key}|${r.country_iso}`;
    const arr = regionByKeyCountry.get(k) ?? [];
    arr.push({ period_start: r.period_start, value: Number(r.value) });
    regionByKeyCountry.set(k, arr);
  }
  const regions: RegionSeries[] = REGION_METRICS.map((m) => ({
    metric_key: m.metric_key,
    label: m.label,
    unit: m.unit,
    format: m.format,
    series: REGION_ORDER
      .map((region) => ({
        region,
        label: REGION_LABELS[region],
        data: regionByKeyCountry.get(`${m.metric_key}|${region}`) ?? [],
      }))
      .filter((s) => s.data.length > 0),
  }));

  return {
    events: eventsRes.data ?? [],
    ecbRate: ezByMetric.get('ecb_main_refi_rate') ?? [],
    balanceSheet: ezByMetric.get('ecb_balance_sheet_total') ?? [],
    m2: ezByMetric.get('m2_eurozone') ?? [],
    eurUsd: ezByMetric.get('eur_usd_rate') ?? [],
    hicpHeadline: ezByMetric.get('eurozone_hicp_headline') ?? [],
    hicpCore: ezByMetric.get('eurozone_hicp_core') ?? [],
    sovereignYields,
    goldEur: ezByMetric.get('gold_eur') ?? [],
    btcEur: ezByMetric.get('btc_eur') ?? [],
    m3PerPerson,
    ezPopulation: ezPop,
    cumulativeInflation,
    inflationBaseYear,
    regions,
  };
}

// Sum the latest population_total across current eurozone members. Used as a
// (slowly changing) denominator for money-supply-per-person.
async function eurozonePopulation(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<number | null> {
  const { data: members } = await admin
    .from('countries').select('iso_code').eq('is_eurozone_member', true);
  const isos = (members ?? []).map((m) => m.iso_code);
  if (isos.length === 0) return null;
  const { data: pop } = await admin
    .from('economic_data_points')
    .select('country_iso, period_start, value')
    .eq('metric_key', 'population_total')
    .in('country_iso', isos)
    .order('period_start', { ascending: true });
  if (!pop || pop.length === 0) return null;
  const latestByCountry = new Map<string, number>();
  for (const r of pop) latestByCountry.set(r.country_iso, Number(r.value)); // ascending → last wins
  let total = 0;
  for (const v of latestByCountry.values()) total += v;
  return total > 0 ? total : null;
}

// Build a price-index series (base year = 100) from a series of annual inflation
// rates. The input is the monthly YoY headline rate; we take each calendar
// year's average rate and compound.
function cumulativeIndexFromAnnualRate(monthlyYoY: SeriesPoint[]): { series: SeriesPoint[]; baseYear: number | null } {
  if (monthlyYoY.length === 0) return { series: [], baseYear: null };
  const byYear = new Map<number, number[]>();
  for (const p of monthlyYoY) {
    const y = parseInt(p.period_start.slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    const arr = byYear.get(y) ?? [];
    arr.push(p.value);
    byYear.set(y, arr);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length === 0) return { series: [], baseYear: null };
  const baseYear = years[0];
  let index = 100;
  const series: SeriesPoint[] = [{ period_start: `${baseYear}-01-01`, value: 100 }];
  for (let i = 1; i < years.length; i++) {
    const y = years[i];
    const rates = byYear.get(y)!;
    const avgRate = rates.reduce((s, v) => s + v, 0) / rates.length;
    index = index * (1 + avgRate / 100);
    series.push({ period_start: `${y}-01-01`, value: Number(index.toFixed(1)) });
  }
  return { series, baseYear };
}
