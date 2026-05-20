import { ECB_EXTRACTORS } from '../src/lib/extractors/ecb';

async function main() {
  const start = '2024-01-01';
  for (const [name, fn] of Object.entries(ECB_EXTRACTORS)) {
    console.log(`\n--- ${name} ---`);
    try {
      const rows = await fn({ startPeriod: start });
      console.log(`  total rows: ${rows.length}`);
      const byMetric = new Map<string, number>();
      for (const r of rows) byMetric.set(r.metric_key, (byMetric.get(r.metric_key) ?? 0) + 1);
      for (const [k, n] of byMetric) console.log(`    ${k}: ${n}`);
      for (const r of rows.slice(0, 2)) console.log(`    ${r.metric_key} ${r.period_start} = ${r.value}`);
    } catch (e) {
      console.error(`  FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
