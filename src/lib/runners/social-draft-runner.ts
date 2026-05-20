// Pure runner: run fact-detector → write candidates → for top-N, generate
// caption + chart PNG → upload to Supabase → insert into social_media_drafts.
//
// Never throws — returns a summary with per-candidate outcomes.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { detectFacts } from '@/lib/social/fact-detector';
import { generateCaption } from '@/lib/social/caption-generator';
import { renderChartCardPng } from '@/lib/social/chart-renderer';
import type { CandidateFact, DataPoint } from '@/lib/social/types';

export type SocialDraftRunSummary = {
  started_at: string;
  finished_at: string;
  candidates_detected: number;
  candidates_inserted: number;
  candidates_existing: number;
  drafts_generated: number;
  drafts_failed: number;
  errors: { message: string }[];
};

export async function runSocialDraftGeneration(opts: { maxDrafts?: number } = {}): Promise<SocialDraftRunSummary> {
  const startedAt = new Date().toISOString();
  const errors: { message: string }[] = [];
  const admin = createSupabaseAdminClient();

  // Configurable cap; default from admin_settings.social.weekly_draft_cap.
  const { data: capRow } = await admin
    .from('admin_settings').select('value').eq('key', 'social.weekly_draft_cap').maybeSingle();
  const cap = opts.maxDrafts ?? (typeof capRow?.value === 'number' ? capRow.value : 20);

  // 1. Detect facts.
  let facts: CandidateFact[] = [];
  try { facts = await detectFacts(); }
  catch (e) {
    errors.push({ message: `detect: ${e instanceof Error ? e.message : e}` });
    return finalise(startedAt, 0, 0, 0, 0, 0, errors);
  }

  // 2. Insert candidates (idempotent via unique index on rule+country+metric+period).
  let inserted = 0; let existing = 0;
  for (const f of facts) {
    const { error } = await admin.from('social_media_candidates').insert({
      country_iso: f.country_iso,
      rule_name: f.rule_name,
      headline: f.headline,
      supporting_data: f.supporting_data,
      priority_score: f.priority_score,
      chart_type: f.chart_type,
    });
    if (error) {
      if (/duplicate/i.test(error.message) || /unique/i.test(error.message) || error.code === '23505') existing++;
      else errors.push({ message: `insert candidate: ${error.message}` });
      continue;
    }
    inserted++;
  }

  // 3. Pick top-priority candidates with status='new' for draft generation.
  const { data: pending } = await admin
    .from('social_media_candidates')
    .select('id, country_iso, rule_name, headline, supporting_data, priority_score, chart_type')
    .eq('status', 'new')
    .order('priority_score', { ascending: false })
    .limit(cap);

  let generated = 0; let failed = 0;
  for (const c of pending ?? []) {
    const fact: CandidateFact = {
      country_iso: c.country_iso,
      rule_name: c.rule_name,
      headline: c.headline,
      supporting_data: c.supporting_data,
      priority_score: c.priority_score,
      chart_type: c.chart_type,
    };
    try {
      await generateOneDraft(admin, c.id, fact);
      generated++;
    } catch (e) {
      failed++;
      errors.push({ message: `draft for candidate ${c.id}: ${e instanceof Error ? e.message : e}` });
    }
  }

  return finalise(startedAt, facts.length, inserted, existing, generated, failed, errors);
}

async function generateOneDraft(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  candidateId: number,
  fact: CandidateFact,
): Promise<void> {
  const country_label = await resolveCountryLabel(admin, fact.country_iso);
  const metric = (fact.supporting_data.metric ?? null) as string | null;

  // Fetch series for the chart (last ~24 points if metric is known).
  let series: DataPoint[] = [];
  let unit = '';
  if (metric && fact.country_iso) {
    const { data } = await admin.from('economic_data_points')
      .select('period_start, value')
      .eq('country_iso', fact.country_iso)
      .eq('metric_key', metric)
      .order('period_start', { ascending: true })
      .limit(48);
    series = (data ?? []).map((r) => ({ period_start: r.period_start, value: Number(r.value) }));

    const { data: m } = await admin.from('metrics').select('unit').eq('key', metric).maybeSingle();
    unit = m?.unit ?? '';
  }

  // Caption via Anthropic.
  const caption = await generateCaption(fact, 'instagram');

  // Render PNG.
  let imageUrl: string | null = null;
  if (fact.chart_type !== 'none' && series.length > 0) {
    const png = await renderChartCardPng({ fact, series, unit, country_label });
    const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from('social-images').upload(key, new Uint8Array(png), {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);
    const { data: pub } = admin.storage.from('social-images').getPublicUrl(key);
    imageUrl = pub.publicUrl;
  }

  // Insert draft + mark candidate promoted.
  const { error: draftErr } = await admin.from('social_media_drafts').insert({
    candidate_id: candidateId,
    post_type: 'chart',
    country_iso: fact.country_iso,
    caption,
    image_url: imageUrl,
    chart_data: { rule: fact.rule_name, supporting_data: fact.supporting_data, series: series.slice(-24) },
    status: 'draft',
    platforms: ['instagram', 'x'],
  });
  if (draftErr) throw new Error(`insert draft: ${draftErr.message}`);

  await admin.from('social_media_candidates').update({ status: 'promoted' }).eq('id', candidateId);
}

async function resolveCountryLabel(admin: ReturnType<typeof createSupabaseAdminClient>, iso: string | null): Promise<string> {
  if (!iso) return 'Eurozone 🇪🇺';
  const { data } = await admin.from('countries').select('name, flag_emoji').eq('iso_code', iso).maybeSingle();
  if (!data) return iso;
  return `${data.name} ${data.flag_emoji ?? ''}`.trim();
}

function finalise(startedAt: string, detected: number, inserted: number, existing: number, generated: number, failed: number, errors: { message: string }[]): SocialDraftRunSummary {
  return {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    candidates_detected: detected,
    candidates_inserted: inserted,
    candidates_existing: existing,
    drafts_generated: generated,
    drafts_failed: failed,
    errors,
  };
}
