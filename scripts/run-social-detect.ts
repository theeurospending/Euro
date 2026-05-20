// One-shot social-draft generation trigger. Same code path as the admin
// "Run detection now" button.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no .env.local */ }

import { runSocialDraftGeneration } from '../src/lib/runners/social-draft-runner';

async function main() {
  const summary = await runSocialDraftGeneration({ maxDrafts: 5 });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
