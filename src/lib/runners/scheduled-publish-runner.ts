// Promotes blog_articles where status='scheduled' AND scheduled_at <= now()
// to status='published' (sets published_at = now()).
// Pure runner — used by /api/cron/publish and (in Session 10) the social publish path.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PublishRunSummary = {
  started_at: string;
  finished_at: string;
  blog_articles_published: number;
  errors: { message: string }[];
};

export async function runScheduledPublish(): Promise<PublishRunSummary> {
  const startedAt = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const errors: { message: string }[] = [];

  const nowIso = new Date().toISOString();
  const { data: due, error: findErr } = await admin
    .from('blog_articles')
    .select('id, slug, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso);

  if (findErr) {
    return {
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      blog_articles_published: 0,
      errors: [{ message: `find scheduled: ${findErr.message}` }],
    };
  }

  let published = 0;
  for (const a of due ?? []) {
    const { error } = await admin
      .from('blog_articles')
      .update({ status: 'published', published_at: nowIso, updated_at: nowIso })
      .eq('id', a.id);
    if (error) errors.push({ message: `publish "${a.slug}": ${error.message}` });
    else published++;
  }

  return {
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    blog_articles_published: published,
    errors,
  };
}
