import { ecb_irs_sovereign_yields } from '../src/lib/extractors/ecb';
import { imf_weo_forecasts } from '../src/lib/extractors/imf';

async function main() {
  console.log('\n--- ecb_irs_sovereign_yields (since 2024) ---');
  const ylds = await ecb_irs_sovereign_yields({ startPeriod: '2024-01-01' });
  console.log(`  total: ${ylds.length}`);
  const by = new Map<string, number>();
  for (const r of ylds) by.set(r.country_iso, (by.get(r.country_iso) ?? 0) + 1);
  console.log(`  countries: ${[...by.keys()].sort().join(' ')}`);
  console.log(`  IT sample:`, ylds.filter((r) => r.country_iso === 'IT').slice(0, 3).map((r) => `${r.period_start}=${r.value}`));

  console.log('\n--- imf_weo_forecasts (since 2020) ---');
  const imf = await imf_weo_forecasts({ sinceYear: 2020 });
  console.log(`  total: ${imf.length}`);
  const byMetric = new Map<string, number>();
  for (const r of imf) byMetric.set(r.metric_key, (byMetric.get(r.metric_key) ?? 0) + 1);
  for (const [k, n] of byMetric) console.log(`    ${k}: ${n}`);
  console.log(`  DE GDP growth 2024+:`,
    imf
      .filter((r) => r.country_iso === 'DE' && r.metric_key === 'imf_gdp_growth_forecast_pct' && r.period_start >= '2024-01-01')
      .slice(0, 6)
      .map((r) => `${r.period_start.slice(0,4)}=${r.value}${r.is_forecast ? '*' : ''}`));
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
