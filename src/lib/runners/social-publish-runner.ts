// Finds drafts where status='scheduled' AND scheduled_at <= now(), sends each
// to the configured Make.com webhook, records the response in social_media_posts,
// updates draft status to 'posted' or 'failed'.
//
// Never throws — per-draft errors are logged but the runner continues.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type SocialPublishSummary = {
  started_at: string;
  finished_at: string;
  posts_attempted: number;
  posts_succeeded: number;
  posts_failed: number;
  errors: { draft_id: number; message: string }[];
  skipped_no_webhook?: boolean;
};

type Draft = {
  id: number;
  candidate_id: number | null;
  country_iso: string | null;
  caption: string;
  image_url: string | null;
  platforms: string[];
  scheduled_at: string | null;
};

export async function runSocialPublish(opts: { draftIds?: number[] } = {}): Promise<SocialPublishSummary> {
  const startedAt = new Date().toISOString();
  const errors: { draft_id: number; message: string }[] = [];
  const admin = createSupabaseAdminClient();

  // Check master cron enable.
  const { data: enableRow } = await admin.from('admin_settings').select('value').eq('key', 'social.cron_enabled').maybeSingle();
  const enabled = enableRow?.value !== false; // default true if missing
  if (!enabled && !opts.draftIds) {
    return { started_at: startedAt, finished_at: new Date().toISOString(), posts_attempted: 0, posts_succeeded: 0, posts_failed: 0, errors: [] };
  }

  // Resolve Make webhook URL.
  const { data: hookRow } = await admin.from('admin_settings').select('value').eq('key', 'social.make_webhook_url').maybeSingle();
  const webhookUrl = (typeof hookRow?.value === 'string' ? hookRow.value : '') as string;
  if (!webhookUrl) {
    return {
      started_at: startedAt, finished_at: new Date().toISOString(),
      posts_attempted: 0, posts_succeeded: 0, posts_failed: 0, errors: [],
      skipped_no_webhook: true,
    };
  }

  // Find due (or explicitly requested) drafts.
  let drafts: Draft[] = [];
  if (opts.draftIds && opts.draftIds.length > 0) {
    const { data } = await admin.from('social_media_drafts').select('*').in('id', opts.draftIds);
    drafts = (data ?? []) as Draft[];
  } else {
    const nowIso = new Date().toISOString();
    const { data } = await admin.from('social_media_drafts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(20);
    drafts = (data ?? []) as Draft[];
  }

  let succeeded = 0; let failed = 0;
  for (const d of drafts) {
    try {
      await publishOne(admin, webhookUrl, d);
      succeeded++;
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ draft_id: d.id, message });
      // Mark draft failed
      await admin.from('social_media_drafts').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', d.id);
    }
  }

  return {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    posts_attempted: drafts.length,
    posts_succeeded: succeeded,
    posts_failed: failed,
    errors,
  };
}

async function publishOne(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  webhookUrl: string,
  draft: Draft,
): Promise<void> {
  const payload = {
    draft_id: draft.id,
    country_iso: draft.country_iso,
    caption: draft.caption,
    image_url: draft.image_url,
    platforms: draft.platforms,
    scheduled_at: draft.scheduled_at,
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 1000) }; }

  if (!res.ok) {
    throw new Error(`Make webhook HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  // Default to all-platforms-ok unless Make's response says otherwise.
  // We expect a shape like { platforms: { instagram: "ok", x: "ok" } } — if Make sends it.
  const platformStatuses: Record<string, string> = {};
  for (const p of draft.platforms) platformStatuses[p] = 'ok';
  if (parsed && typeof parsed === 'object' && parsed && 'platforms' in parsed) {
    const responsePlatforms = (parsed as Record<string, unknown>).platforms;
    if (responsePlatforms && typeof responsePlatforms === 'object') {
      Object.assign(platformStatuses, responsePlatforms);
    }
  }

  // Write post history row.
  const { error: postErr } = await admin.from('social_media_posts').insert({
    draft_id: draft.id,
    country_iso: draft.country_iso,
    caption: draft.caption,
    image_url: draft.image_url,
    platforms: draft.platforms,
    platform_statuses: platformStatuses,
    make_response: parsed ?? null,
  });
  if (postErr) throw new Error(`insert post: ${postErr.message}`);

  // Mark draft posted.
  const { error: draftErr } = await admin.from('social_media_drafts')
    .update({ status: 'posted', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', draft.id);
  if (draftErr) throw new Error(`update draft: ${draftErr.message}`);
}
