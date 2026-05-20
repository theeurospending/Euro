// Detect N consecutive periods of monotonic increase or decrease.

import type { CandidateFact, SeriesIndex } from '@/lib/social/types';

const STREAK_MIN = 5;        // need at least 5 in a row to be noteworthy
const METRICS = ['gov_debt_pct_gdp', 'hicp_annual_pct', 'unemployment_rate_pct'];

export function detectStreaks(series: SeriesIndex, countries: string[]): CandidateFact[] {
  const out: CandidateFact[] = [];
  for (const iso of countries) {
    for (const metric of METRICS) {
      const arr = series.get(`${iso}|${metric}`);
      if (!arr || arr.length < STREAK_MIN + 1) continue;

      let dir: 1 | -1 | 0 = 0;
      let len = 1;
      for (let i = arr.length - 1; i > 0; i--) {
        const d = Math.sign(arr[i].value - arr[i - 1].value) as 1 | -1 | 0;
        if (d === 0) break;
        if (dir === 0) { dir = d; len = 1; continue; }
        if (d !== dir) break;
        len++;
      }
      if (len >= STREAK_MIN && dir !== 0) {
        const latest = arr[arr.length - 1];
        out.push({
          country_iso: iso,
          rule_name: 'streak',
          headline: `${iso} ${metric}: ${len} consecutive periods of ${dir === 1 ? 'increases' : 'decreases'} (latest ${latest.value.toFixed(2)})`,
          supporting_data: { metric, period: latest.period_start, value: latest.value, streak_length: len, direction: dir === 1 ? 'up' : 'down' },
          priority_score: 50 + Math.min(20, len * 2),
          chart_type: 'line',
        });
      }
    }
  }
  return out;
}
