// Detect when a country moves into the top-3 or bottom-3 of EU27 for a metric.

import type { CandidateFact, SeriesIndex } from '@/lib/social/types';

const METRICS_OF_INTEREST = [
  'gov_debt_pct_gdp',
  'gov_deficit_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
];

const EU27 = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];

export function detectRankChanges(series: SeriesIndex): CandidateFact[] {
  const out: CandidateFact[] = [];

  for (const metric of METRICS_OF_INTEREST) {
    // For the latest period of this metric, compute the rank table.
    const latestByCountry = new Map<string, { value: number; period: string }>();
    const priorByCountry = new Map<string, number>();
    for (const iso of EU27) {
      const arr = series.get(`${iso}|${metric}`);
      if (!arr || arr.length === 0) continue;
      const latest = arr[arr.length - 1];
      latestByCountry.set(iso, { value: latest.value, period: latest.period_start });
      if (arr.length >= 2) priorByCountry.set(iso, arr[arr.length - 2].value);
    }
    if (latestByCountry.size < 5) continue;

    // Sort descending.
    const rankedNow = [...latestByCountry.entries()].sort((a, b) => b[1].value - a[1].value);
    const rankedPrior = [...latestByCountry.entries()]
      .filter(([iso]) => priorByCountry.has(iso))
      .sort((a, b) => (priorByCountry.get(b[0])! - priorByCountry.get(a[0])!));

    const top3Now = new Set(rankedNow.slice(0, 3).map(([iso]) => iso));
    const top3Prior = new Set(rankedPrior.slice(0, 3).map(([iso]) => iso));
    const bottom3Now = new Set(rankedNow.slice(-3).map(([iso]) => iso));
    const bottom3Prior = new Set(rankedPrior.slice(-3).map(([iso]) => iso));

    for (const iso of top3Now) {
      if (!top3Prior.has(iso)) {
        const v = latestByCountry.get(iso)!;
        out.push({
          country_iso: iso,
          rule_name: 'rank_change',
          headline: `${iso} entered EU top-3 for ${metric} at ${v.value.toFixed(2)} (${v.period.slice(0, 7)})`,
          supporting_data: { metric, period: v.period, value: v.value, direction: 'into_top3' },
          priority_score: 70,
          chart_type: 'bar',
        });
      }
    }
    for (const iso of bottom3Now) {
      if (!bottom3Prior.has(iso)) {
        const v = latestByCountry.get(iso)!;
        out.push({
          country_iso: iso,
          rule_name: 'rank_change',
          headline: `${iso} entered EU bottom-3 for ${metric} at ${v.value.toFixed(2)} (${v.period.slice(0, 7)})`,
          supporting_data: { metric, period: v.period, value: v.value, direction: 'into_bottom3' },
          priority_score: 70,
          chart_type: 'bar',
        });
      }
    }
  }
  return out;
}
