import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const EUROZONE_PERIPHERALS = ['IT', 'ES', 'GR', 'PT', 'IE'];

export type EuroPageData = {
  events: MonetaryEvent[];
  ecbRate: SeriesPoint[];
  balanceSheet: SeriesPoint[];
  m2: SeriesPoint[];
  eurUsd: SeriesPoint[];
  hicpHeadline: SeriesPoint[];
  hicpCore: SeriesPoint[];
  sovereignYields: { country_iso: string; country_name: string; data: SeriesPoint[] }[];
};

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
  const ezMetrics = ['ecb_main_refi_rate', 'ecb_balance_sheet_total', 'm2_eurozone', 'eur_usd_rate', 'eurozone_hicp_headline', 'eurozone_hicp_core'];

  const [eventsRes, ezRowsRes, yieldRowsRes, countriesRes] = await Promise.all([
    admin.from('monetary_events').select('*').order('event_date', { ascending: true }),
    admin.from('economic_data_points')
      .select('metric_key, period_start, value')
      .eq('country_iso', 'EZ')
      .in('metric_key', ezMetrics)
      .order('period_start', { ascending: true }),
    admin.from('economic_data_points')
      .select('country_iso, period_start, value')
      .eq('metric_key', 'sovereign_10y_yield')
      .in('country_iso', yieldsCountries)
      .order('period_start', { ascending: true }),
    admin.from('countries').select('iso_code, name').in('iso_code', yieldsCountries),
  ]);

  const ezByMetric = new Map<string, SeriesPoint[]>();
  for (const m of ezMetrics) ezByMetric.set(m, []);
  for (const r of ezRowsRes.data ?? []) {
    ezByMetric.get(r.metric_key)?.push({ period_start: r.period_start, value: Number(r.value) });
  }

  const yieldsByCountry = new Map<string, SeriesPoint[]>();
  for (const r of yieldRowsRes.data ?? []) {
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

  return {
    events: eventsRes.data ?? [],
    ecbRate: ezByMetric.get('ecb_main_refi_rate') ?? [],
    balanceSheet: ezByMetric.get('ecb_balance_sheet_total') ?? [],
    m2: ezByMetric.get('m2_eurozone') ?? [],
    eurUsd: ezByMetric.get('eur_usd_rate') ?? [],
    hicpHeadline: ezByMetric.get('eurozone_hicp_headline') ?? [],
    hicpCore: ezByMetric.get('eurozone_hicp_core') ?? [],
    sovereignYields,
  };
}
