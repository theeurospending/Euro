// Detect when the latest value is the highest or lowest in the last N years.

import type { CandidateFact, SeriesIndex } from '@/lib/social/types';

const LOOKBACKS = [5, 10, 25];

// Whitelist of metrics where "extreme" is newsworthy.
const METRICS_OF_INTEREST = [
  'gov_deficit_pct_gdp',
  'gov_debt_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
  'gdp_real_growth_pct',
  'sovereign_10y_yield',
];

export function detectMultiYearExtremes(series: SeriesIndex, countries: string[]): CandidateFact[] {
  const out: CandidateFact[] = [];
  for (const iso of countries) {
    for (const metric of METRICS_OF_INTEREST) {
      const arr = series.get(`${iso}|${metric}`);
      if (!arr || arr.length < 6) continue;
      const latest = arr[arr.length - 1];

      for (const N of LOOKBACKS) {
        // Look back N "data points" — could be N months or N years depending on metric frequency.
        const window = arr.slice(-N - 1, -1); // exclude latest
        if (window.length < N) continue;
        const max = window.reduce((m, p) => p.value > m.value ? p : m);
        const min = window.reduce((m, p) => p.value < m.value ? p : m);
        if (latest.value > max.value) {
          out.push({
            country_iso: iso,
            rule_name: 'multi_year_extreme',
            headline: `${iso} ${metric}: highest in ${N} periods (${latest.value.toFixed(2)} vs ${N}-period prior peak ${max.value.toFixed(2)})`,
            supporting_data: {
              metric, period: latest.period_start, value: latest.value,
              direction: 'high', lookback_periods: N,
              prior_extreme_value: max.value, prior_extreme_period: max.period_start,
            },
            priority_score: 60 + Math.min(20, N),
            chart_type: 'line',
          });
          break; // don't double-emit for 5/10/25 — biggest wins
        } else if (latest.value < min.value) {
          out.push({
            country_iso: iso,
            rule_name: 'multi_year_extreme',
            headline: `${iso} ${metric}: lowest in ${N} periods (${latest.value.toFixed(2)} vs ${N}-period prior low ${min.value.toFixed(2)})`,
            supporting_data: {
              metric, period: latest.period_start, value: latest.value,
              direction: 'low', lookback_periods: N,
              prior_extreme_value: min.value, prior_extreme_period: min.period_start,
            },
            priority_score: 60 + Math.min(20, N),
            chart_type: 'line',
          });
          break;
        }
      }
    }
  }
  return out;
}
