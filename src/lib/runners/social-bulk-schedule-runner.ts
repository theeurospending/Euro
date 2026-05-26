// Bulk "generate + schedule" for social drafts.
//
// 1. Optionally generate up to `generateTarget` drafts (candidate-limited — the
//    detector only produces drafts for genuinely newsworthy facts, so the count
//    may come up short).
// 2. Slot every still-unscheduled draft into the next `days` days at 08:00 and
//    17:00 London time, oldest draft first, skipping past slots and any slot
//    already taken by an existing scheduled draft. Idempotent: re-running fills
//    remaining slots without double-booking.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { runSocialDraftGeneration } from './social-draft-runner';

export type BulkScheduleSummary = {
  started_at: string;
  finished_at: string;
  generated: number;
  generation_failed: number;
  candidates_detected: number;
  free_slots: number;
  scheduled: number;
  drafts_remaining: number;
  first_slot: string | null;
  last_slot: string | null;
  errors: { message: string }[];
};

const LONDON = 'Europe/London';
const SLOT_HOURS = [8, 17];

// Minutes by which Europe/London wall-clock leads UTC at a given instant (DST-aware).
function londonOffsetMinutes(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(utcMs)).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
  return Math.round((localAsUtc - utcMs) / 60000);
}

// UTC ISO instant whose Europe/London wall-clock is the given Y-M-D H:00.
function londonWallToUtcIso(year: number, month1: number, day: number, hour: number): string {
  const wallAsUtc = Date.UTC(year, month1 - 1, day, hour, 0, 0);
  let utc = wallAsUtc;
  for (let i = 0; i < 2; i++) utc = wallAsUtc - londonOffsetMinutes(utc) * 60000;
  return new Date(utc).toISOString();
}

export async function runSocialBulkSchedule(opts: { generateTarget?: number; days?: number } = {}): Promise<BulkScheduleSummary> {
  const startedAt = new Date().toISOString();
  const errors: { message: string }[] = [];
  const admin = createSupabaseAdminClient();
  const generateTarget = Math.max(0, opts.generateTarget ?? 100);
  const days = Math.max(1, Math.min(120, opts.days ?? 30));

  // 1. Generate (optional).
  let generated = 0, generationFailed = 0, candidates = 0;
  if (generateTarget > 0) {
    try {
      const gen = await runSocialDraftGeneration({ maxDrafts: generateTarget });
      generated = gen.drafts_generated;
      generationFailed = gen.drafts_failed;
      candidates = gen.candidates_detected;
      for (const e of gen.errors) errors.push({ message: `generate: ${e.message}` });
    } catch (e) {
      errors.push({ message: `generate: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // 2. Build future 08:00 / 17:00 London slots.
  const now = Date.now();
  const base = new Date();
  const slots: string[] = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(base);
    dt.setUTCDate(base.getUTCDate() + d);
    for (const h of SLOT_HOURS) {
      const iso = londonWallToUtcIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), h);
      if (Date.parse(iso) > now) slots.push(iso);
    }
  }
  slots.sort();

  // 3. Drop slots already taken by existing scheduled drafts.
  const { data: existing } = await admin
    .from('social_media_drafts')
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .not('scheduled_at', 'is', null);
  const taken = new Set((existing ?? []).map((r) => r.scheduled_at as string));
  const freeSlots = slots.filter((s) => !taken.has(s));

  // 4. Unscheduled drafts with an image, oldest first.
  const { data: drafts } = await admin
    .from('social_media_drafts')
    .select('id')
    .eq('status', 'draft')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: true });
  const queue = (drafts ?? []).map((d) => d.id as number);

  // 5. Assign chronologically.
  const n = Math.min(queue.length, freeSlots.length);
  let scheduled = 0;
  for (let i = 0; i < n; i++) {
    const { error } = await admin
      .from('social_media_drafts')
      .update({ status: 'scheduled', scheduled_at: freeSlots[i], updated_at: new Date().toISOString() })
      .eq('id', queue[i])
      .eq('status', 'draft');
    if (error) errors.push({ message: `schedule draft ${queue[i]}: ${error.message}` });
    else scheduled++;
  }

  return {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    generated,
    generation_failed: generationFailed,
    candidates_detected: candidates,
    free_slots: freeSlots.length,
    scheduled,
    drafts_remaining: Math.max(0, queue.length - scheduled),
    first_slot: scheduled > 0 ? freeSlots[0] : null,
    last_slot: scheduled > 0 ? freeSlots[scheduled - 1] : null,
    errors,
  };
}
