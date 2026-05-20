// Detect when a country crossed a notable threshold this period vs the prior.
// Thresholds covered: Maastricht 3% deficit, 60% debt, ECB 2% HICP target.

import type { CandidateFact, SeriesIndex } from '@/lib/social/types';

const THRESHOLDS: Array<{ metric: string; level: number; direction: 'above' | 'below'; label: string }> = [
  { metric: 'gov_deficit_pct_gdp', level: -3,   direction: 'below', label: 'Maastricht 3% deficit limit' },
  { metric: 'gov_debt_pct_gdp',    level: 60,   direction: 'above', label: 'Maastricht 60% debt limit' },
  { metric: 'gov_debt_pct_gdp',    level: 100,  direction: 'above', label: '100% debt-to-GDP' },
  { metric: 'gov_debt_pct_gdp',    level: 150,  direction: 'above', label: '150% debt-to-GDP' },
  { metric: 'hicp_annual_pct',     level: 2,    direction: 'above', label: 'ECB 2% inflation target' },
  { metric: 'hicp_annual_pct',     level: 5,    direction: 'above', label: '5% inflation' },
];

export function detectThresholdCrossings(series: SeriesIndex, countries: string[]): CandidateFact[] {
  const out: CandidateFact[] = [];
  for (const iso of countries) {
    for (const t of THRESHOLDS) {
      const arr = series.get(`${iso}|${t.metric}`);
      if (!arr || arr.length < 2) continue;
      const latest = arr[arr.length - 1];
      const prior = arr[arr.length - 2];
      const crossed = t.direction === 'above'
        ? (prior.value < t.level && latest.value >= t.level) ||
          (prior.value > t.level && latest.value <= t.level)
        : (prior.value > t.level && latest.value <= t.level) ||
          (prior.value < t.level && latest.value >= t.level);
      if (!crossed) continue;
      const goingThru = (t.direction === 'above' && latest.value >= t.level) || (t.direction === 'below' && latest.value <= t.level);
      out.push({
        country_iso: iso,
        rule_name: 'threshold_crossing',
        headline: `${iso} ${goingThru ? 'crossed' : 'fell back below'} the ${t.label}: ${latest.value.toFixed(1)} (${latest.period_start.slice(0, 4)}, prior ${prior.value.toFixed(1)})`,
        supporting_data: {
          metric: t.metric,
          period: latest.period_start,
          value: latest.value,
          prior_value: prior.value,
          threshold: t.level,
          threshold_label: t.label,
          direction: t.direction,
          crossed_into: goingThru,
        },
        priority_score: 80,
        chart_type: 'line',
      });
    }
  }
  return out;
}
