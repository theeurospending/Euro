// Quick sanity test for Eurostat extractors. Run with: npx tsx scripts/test-eurostat.ts
// Not part of the deployed app — used only to validate API plumbing locally.

import {
  eurostat_gov_10a_main,
  eurostat_gov_10dd_edpt1,
  eurostat_gov_10a_exp_cofog,
  eurostat_nama_10_gdp,
  eurostat_nama_10_pc,
  eurostat_prc_hicp_aind,
  eurostat_une_rt_a,
  eurostat_demo_pjan,
} from '../src/lib/extractors/eurostat';

async function run(label: string, fn: () => Promise<{ country_iso: string; metric_key: string; period_start: string; value: number }[]>) {
  console.log(`\n--- ${label} ---`);
  try {
    const rows = await fn();
    console.log(`  total rows: ${rows.length}`);
    const byMetric = new Map<string, number>();
    for (const r of rows) byMetric.set(r.metric_key, (byMetric.get(r.metric_key) ?? 0) + 1);
    for (const [k, n] of byMetric) console.log(`    ${k}: ${n}`);
    const de = rows.filter((r) => r.country_iso === 'DE').slice(0, 2);
    for (const r of de) console.log(`    DE ${r.metric_key} ${r.period_start} = ${r.value}`);
  } catch (e) {
    console.error(`  FAILED: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  const since = 2022; // 2 years, keeps test fast
  await run('gov_10a_main',     () => eurostat_gov_10a_main({ sinceYear: since }));
  await run('gov_10dd_edpt1',   () => eurostat_gov_10dd_edpt1({ sinceYear: since }));
  await run('gov_10a_exp_cofog',() => eurostat_gov_10a_exp_cofog({ sinceYear: since }));
  await run('nama_10_gdp',      () => eurostat_nama_10_gdp({ sinceYear: since }));
  await run('nama_10_pc',       () => eurostat_nama_10_pc({ sinceYear: since }));
  await run('prc_hicp_aind',    () => eurostat_prc_hicp_aind({ sinceYear: since }));
  await run('une_rt_a',         () => eurostat_une_rt_a({ sinceYear: since }));
  await run('demo_pjan',        () => eurostat_demo_pjan({ sinceYear: since }));
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
