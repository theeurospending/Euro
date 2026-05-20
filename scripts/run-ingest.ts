// One-shot ingest trigger. Invokes the same runner used by the cron + admin API,
// authenticated via the service role key.
// Usage: npx tsx scripts/run-ingest.ts [source_name [source_name ...]]

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local manually so this works whether tsx is invoked via npx or otherwise.
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no .env.local */ }

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
