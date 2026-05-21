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

  // Detect Make's default "Accepted" immediate-response (returned BEFORE the
  // scenario actually runs). When we see this, the post may have failed at
  // Buffer/Meta downstream — we can't know. Surface this as a partial/unknown
  // state rather than silently claiming success.
  const isStructuredResponse = parsed && typeof parsed === 'object' && 'platforms' in parsed;
  const isMakeImmediateAck =
    !isStructuredResponse && (
      text.trim() === 'Accepted' ||
      (parsed && typeof parsed === 'object' && 'raw' in (parsed as Record<string, unknown>) &&
       String((parsed as Record<string, unknown>).raw).trim() === 'Accepted')
    );

  const platformStatuses: Record<string, string> = {};
  if (isStructuredResponse) {
    // Make returned a real per-platform map — use it.
    for (const p of draft.platforms) platformStatuses[p] = 'ok';
    const respPlatforms = (parsed as Record<string, unknown>).platforms;
    if (respPlatforms && typeof respPlatforms === 'object') {
      Object.assign(platformStatuses, respPlatforms);
    }
  } else if (isMakeImmediateAck) {
    // Make swallowed the response — we genuinely don't know what happened.
    for (const p of draft.platforms) platformStatuses[p] = 'unknown';
  } else {
    // Some other 2xx — assume best case.
    for (const p of draft.platforms) platformStatuses[p] = 'ok';
  }

  // If any platform shows "error", treat the whole publish as a failure.
  const failedPlatforms = Object.entries(platformStatuses)
    .filter(([, status]) => typeof status === 'string' && status.toLowerCase().startsWith('error'));
  const anyUnknown = Object.values(platformStatuses).some((s) => s === 'unknown');

  // Persist a post history row in every case — even failures — so the admin
  // /admin/social-media/posts page reflects reality.
  const errorMessage = failedPlatforms.length > 0
    ? `Make reported failures: ${failedPlatforms.map(([k, v]) => `${k}=${v}`).join(', ')}`
    : anyUnknown
      ? 'Make returned "Accepted" before the scenario completed — actual platform delivery is unknown. Wire a Webhook Response module at the end of the scenario.'
      : null;

  const { error: postErr } = await admin.from('social_media_posts').insert({
    draft_id: draft.id,
    country_iso: draft.country_iso,
    caption: draft.caption,
    image_url: draft.image_url,
    platforms: draft.platforms,
    platform_statuses: platformStatuses,
    make_response: parsed ?? null,
    error_message: errorMessage,
  });
  if (postErr) throw new Error(`insert post: ${postErr.message}`);

  // Surface failures back up to the caller so the draft is marked 'failed',
  // not 'posted', and surfaces in the admin UI.
  if (failedPlatforms.length > 0) {
    throw new Error(errorMessage!);
  }

  // Mark draft posted (or 'posted_unknown' if we genuinely don't know).
  const draftStatus = anyUnknown ? 'posted' : 'posted'; // status stays 'posted' for UI compat; error_message carries the warning
  const { error: draftErr } = await admin.from('social_media_drafts')
    .update({
      status: draftStatus,
      error_message: anyUnknown ? errorMessage : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draft.id);
  if (draftErr) throw new Error(`update draft: ${draftErr.message}`);
}
