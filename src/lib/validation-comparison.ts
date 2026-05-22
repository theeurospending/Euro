// Cross-validates economic_data_points across sources for the same logical
// metric. Surfaces rows where two sources disagree by more than a threshold.
//
// IMF WEO has parallel timeseries for several Eurostat metrics. For EU member
// data, the two should match closely — large diffs usually indicate stale
// Eurostat data, methodological differences, or IMF mid-year revisions.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAll } from '@/lib/supabase/paginate';

export const COMPARABLE_PAIRS = [
  { label: 'Real GDP growth',  primary: 'gdp_real_growth_pct',  secondary: 'imf_gdp_growth_forecast_pct',     unit: '%',        threshold_abs: 0.5 },
  { label: 'Government debt',  primary: 'gov_debt_pct_gdp',     secondary: 'imf_gross_debt_forecast_pct_gdp', unit: '% of GDP', threshold_abs: 2.0 },
  { label: 'Deficit (B.9)',    primary: 'gov_deficit_pct_gdp',  secondary: 'imf_net_lending_forecast_pct_gdp',unit: '% of GDP', threshold_abs: 0.5 },
  { label: 'HICP inflation',   primary: 'hicp_annual_pct',      secondary: 'imf_inflation_forecast_pct',      unit: '%',        threshold_abs: 0.5 },
] as const;

export type ComparisonRow = {
  country_iso: string;
  country_name: string;
  flag_emoji: string | null;
  period_start: string;
  primary_value: number;
  secondary_value: number;
  abs_diff: number;
  is_forecast_period: boolean;
};

export type ComparisonGroup = {
  label: string;
  primary: string;
  secondary: string;
  unit: string;
  threshold_abs: number;
  rows: ComparisonRow[];
};

export async function loadValidationComparison(): Promise<ComparisonGroup[]> {
  const admin = createSupabaseAdminClient();
  const { data: countries } = await admin.from('countries').select('iso_code, name, flag_emoji');
  const nameMap = new Map((countries ?? []).map((c) => [c.iso_code, c]));
  const currentYear = new Date().getUTCFullYear();
  const groups: ComparisonGroup[] = [];

  for (const pair of COMPARABLE_PAIRS) {
    // Pull both source values across all countries × all periods.
    const allPoints = await fetchAll<{ country_iso: string; metric_key: string; period_start: string; value: number; is_forecast: boolean }>(
      (from, to) => admin.from('economic_data_points')
        .select('country_iso, metric_key, period_start, value, is_forecast')
        .in('metric_key', [pair.primary, pair.secondary])
        .order('period_start', { ascending: true })
        .range(from, to)
    );

    // Index by (country, period) → { primary, secondary }
    type Cell = { primary?: number; secondary?: number; forecast?: boolean };
    const cells = new Map<string, Cell>();
    for (const p of allPoints) {
      const k = `${p.country_iso}|${p.period_start}`;
      const cell = cells.get(k) ?? {};
      if (p.metric_key === pair.primary) cell.primary = Number(p.value);
      else if (p.metric_key === pair.secondary) {
        cell.secondary = Number(p.value);
        cell.forecast = p.is_forecast;
      }
      cells.set(k, cell);
    }

    // Find diffs over threshold for historical (non-forecast) years only.
    const rows: ComparisonRow[] = [];
    for (const [k, cell] of cells) {
      if (cell.primary == null || cell.secondary == null) continue;
      const abs_diff = Math.abs(cell.primary - cell.secondary);
      if (abs_diff < pair.threshold_abs) continue;
      const [iso, period_start] = k.split('|');
      const periodYear = parseInt(period_start.slice(0, 4), 10);
      const country = nameMap.get(iso);
      if (!country) continue;
      rows.push({
        country_iso: iso,
        country_name: country.name,
        flag_emoji: country.flag_emoji,
        period_start,
        primary_value: cell.primary,
        secondary_value: cell.secondary,
        abs_diff,
        is_forecast_period: periodYear > currentYear || (cell.forecast ?? false),
      });
    }
    rows.sort((a, b) => b.abs_diff - a.abs_diff);
    groups.push({ ...pair, rows: rows.slice(0, 50) });
  }

  return groups;
}
