// One-shot ingest trigger. Invokes the same runner used by the cron + admin API,
// authenticated via the service role key.
// Usage: npx tsx scripts/run-ingest.ts [source_name [source_name ...]]

import { runIngest } from '../src/lib/runners/ingest-runner';

async function main() {
  const args = process.argv.slice(2);
  const sourceNames = args.length > 0 ? args : undefined;
  const summary = await runIngest({
    sourceNames,
    triggeredBy: 'manual',
  });
  console.log(JSON.stringify(summary, null, 2));
  const failed = summary.sources.filter((s) => s.status === 'error');
  if (failed.length > 0) {
    console.error(`\n${failed.length} source(s) failed.`);
    process.exit(1);
  }
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
