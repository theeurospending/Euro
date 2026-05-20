// One-shot: trim existing social_media_drafts captions to <=240 chars at the
// last word boundary, so they pass X's 280-char limit and can be re-posted.
// Only touches non-posted statuses (draft, scheduled, failed).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

import { createSupabaseAdminClient } from '../src/lib/supabase/admin';

const MAX = 240;

function trim(caption: string): string {
  if (caption.length <= MAX) return caption;
  const cut = caption.slice(0, MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const safe = lastSpace > MAX - 30 ? cut.slice(0, lastSpace) : cut;
  return safe.replace(/[.,;:!?\-—\s]+$/, '') + '…';
}

async function main() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('social_media_drafts')
    .select('id, caption, status')
    .in('status', ['draft', 'scheduled', 'failed'])
    .order('id');
  if (!data) { console.log('no drafts'); return; }

  let touched = 0;
  for (const d of data) {
    const trimmed = trim(d.caption);
    if (trimmed === d.caption) continue;
    const { error } = await admin
      .from('social_media_drafts')
      .update({ caption: trimmed, error_message: null, updated_at: new Date().toISOString() })
      .eq('id', d.id);
    if (error) { console.error(`#${d.id} failed:`, error.message); continue; }
    touched++;
    console.log(`#${d.id} (${d.status}) ${d.caption.length} → ${trimmed.length} chars`);
  }
  console.log(`\nTrimmed ${touched} drafts.`);
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
