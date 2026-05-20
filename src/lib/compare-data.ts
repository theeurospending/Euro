import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ComparableMetric = {
  key: string;
  display_name: string;
  unit: string;
  frequency: string;
};

export type CompareSeries = {
  country_iso: string;
  country_name: string;
  flag_emoji: string | null;
  data: { period_start: string; value: number; is_forecast: boolean }[];
};

export type LeaderboardRow = {
  country_iso: string;
  country_name: string;
  flag_emoji: string | null;
  latest_value: number;
  latest_period: string;
  yoy_delta_abs: number | null;
  five_year_delta_abs: number | null;
};

export async function listComparableMetrics(): Promise<ComparableMetric[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('metrics')
    .select('key, display_name, unit, frequency')
    .eq('is_active', true)
    .order('display_order');
  return data ?? [];
}

export async function loadCompareSeries(
  countries: string[],
  metricKey: string,
  fromYear: number | null,
): Promise<CompareSeries[]> {
  if (countries.length === 0) return [];
  const admin = createSupabaseAdminClient();

  const fromISO = fromYear ? `${fromYear}-01-01` : '1999-01-01';

  const [{ data: countryRows }, { data: dataPoints }] = await Promise.all([
    admin.from('countries').select('iso_code, name, flag_emoji').in('iso_code', countries),
    admin.from('economic_data_points')
      .select('country_iso, period_start, value, is_forecast')
      .in('country_iso', countries)
      .eq('metric_key', metricKey)
      .gte('period_start', fromISO)
      .order('period_start', { ascending: true }),
  ]);

  const countriesMap = new Map((countryRows ?? []).map((c) => [c.iso_code, c]));
  const byCountry = new Map<string, CompareSeries>();
  for (const iso of countries) {
    const c = countriesMap.get(iso);
    if (!c) continue;
    byCountry.set(iso, { country_iso: iso, country_name: c.name, flag_emoji: c.flag_emoji, data: [] });
  }
  for (const r of dataPoints ?? []) {
    byCountry.get(r.country_iso)?.data.push({
      period_start: r.period_start,
      value: Number(r.value),
      is_forecast: r.is_forecast,
    });
  }
  // Preserve user-specified order.
  return countries.map((iso) => byCountry.get(iso)!).filter(Boolean);
}

export async function loadLeaderboard(metricKey: string, restrictTo: 'eu27' | 'all' = 'eu27'): Promise<LeaderboardRow[]> {
  const admin = createSupabaseAdminClient();
  // Find latest period for this metric.
  const { data: latestPeriodRow } = await admin
    .from('economic_data_points')
    .select('period_start')
    .eq('metric_key', metricKey)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestPeriodRow) return [];
  const latestPeriod = latestPeriodRow.period_start;

  // Compute "1 year ago" + "5 years ago" period_starts based on the frequency of the metric.
  // For annual: YYYY-01-01 minus 1y / 5y; for monthly: same month, 1 year / 5 years back, etc.
  const latest = new Date(latestPeriod);
  const yearAgo = new Date(latest);
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const fiveAgo = new Date(latest);
  fiveAgo.setUTCFullYear(fiveAgo.getUTCFullYear() - 5);

  const COUNTRIES_EU27 = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  const COMPARATORS = restrictTo === 'all' ? ['GB','US','CH','NO'] : [];
  const isoList = [...COUNTRIES_EU27, ...COMPARATORS];

  const [{ data: countryRows }, { data: pointRows }] = await Promise.all([
    admin.from('countries').select('iso_code, name, flag_emoji').in('iso_code', isoList),
    admin.from('economic_data_points')
      .select('country_iso, period_start, value')
      .eq('metric_key', metricKey)
      .in('country_iso', isoList)
      .in('period_start', [latestPeriod, yearAgo.toISOString().slice(0, 10), fiveAgo.toISOString().slice(0, 10)]),
  ]);

  const namesMap = new Map((countryRows ?? []).map((c) => [c.iso_code, c]));
  const rowsByCountryPeriod = new Map<string, Map<string, number>>();
  for (const r of pointRows ?? []) {
    const inner = rowsByCountryPeriod.get(r.country_iso) ?? new Map();
    inner.set(r.period_start, Number(r.value));
    rowsByCountryPeriod.set(r.country_iso, inner);
  }

  const out: LeaderboardRow[] = [];
  for (const iso of isoList) {
    const c = namesMap.get(iso);
    if (!c) continue;
    const inner = rowsByCountryPeriod.get(iso);
    const latestVal = inner?.get(latestPeriod);
    if (latestVal == null) continue;
    const yoyVal = inner?.get(yearAgo.toISOString().slice(0, 10));
    const fiveYrVal = inner?.get(fiveAgo.toISOString().slice(0, 10));
    out.push({
      country_iso: iso,
      country_name: c.name,
      flag_emoji: c.flag_emoji,
      latest_value: latestVal,
      latest_period: latestPeriod,
      yoy_delta_abs: yoyVal != null ? latestVal - yoyVal : null,
      five_year_delta_abs: fiveYrVal != null ? latestVal - fiveYrVal : null,
    });
  }
  out.sort((a, b) => b.latest_value - a.latest_value);
  return out;
}
