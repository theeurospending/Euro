// Weekly newsletter digest. Composes the body from:
//   - This week's top-priority social candidates (≤3, the "biggest moves")
//   - Any blog articles published in the past 7 days
//   - Any monetary events anniversary this week
// Sends to all confirmed subscribers.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getResend, applyTemplate } from '@/lib/email';
import { fetchAll } from '@/lib/supabase/paginate';

const FROM = 'Eurospending <hello@eurospending.org>';
const BASE = 'https://eurospending.org';

export type DigestSummary = {
  started_at: string;
  finished_at: string;
  subject: string;
  subscriber_count: number;
  errors: { email: string; message: string }[];
  skipped_no_resend?: boolean;
  skipped_no_subscribers?: boolean;
};

export async function runWeeklyDigest(opts: { dryRun?: boolean } = {}): Promise<DigestSummary> {
  const started_at = new Date().toISOString();
  const errors: { email: string; message: string }[] = [];

  if (!process.env.RESEND_API_KEY) {
    return { started_at, finished_at: new Date().toISOString(), subject: '', subscriber_count: 0, errors, skipped_no_resend: true };
  }

  const admin = createSupabaseAdminClient();
  const weekAgo = new Date(); weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  // 1. Pull this week's top social candidates (highest priority, with country + headline).
  const { data: facts } = await admin
    .from('social_media_candidates')
    .select('country_iso, rule_name, headline, supporting_data, priority_score')
    .gte('detected_at', weekAgoIso)
    .order('priority_score', { ascending: false })
    .limit(5);

  // 2. Recently published articles.
  const { data: articles } = await admin
    .from('blog_articles')
    .select('slug, title, excerpt, published_at')
    .eq('status', 'published')
    .gte('published_at', weekAgoIso)
    .order('published_at', { ascending: false })
    .limit(5);

  // 3. Anniversaries this week.
  const { data: events } = await admin
    .from('monetary_events')
    .select('event_date, title, description')
    .order('event_date');
  const today = new Date();
  const annivList: { years: number; title: string; date: string }[] = [];
  for (const ev of events ?? []) {
    const evDate = new Date(ev.event_date);
    if (Math.abs(evDate.getUTCMonth() - today.getUTCMonth()) > 0) continue;
    const dayDiff = Math.abs(evDate.getUTCDate() - today.getUTCDate());
    if (dayDiff > 3) continue;
    const years = today.getUTCFullYear() - evDate.getUTCFullYear();
    if (years >= 1) annivList.push({ years, title: ev.title, date: ev.event_date });
  }

  // 4. Compose HTML body via the email_templates row.
  const { data: tpl } = await admin.from('email_templates').select('subject, body_html').eq('key', 'newsletter_weekly_digest').maybeSingle();
  if (!tpl) {
    return { started_at, finished_at: new Date().toISOString(), subject: '', subscriber_count: 0, errors: [{ email: '', message: 'template newsletter_weekly_digest missing' }] };
  }

  const factsHtml = (facts ?? []).map((f) => `<li>${escapeHtml(f.headline)}</li>`).join('');
  const articlesHtml = (articles ?? []).length === 0
    ? '<p style="color:#888;">No new articles this week.</p>'
    : `<ul>${(articles ?? []).map((a) => `<li><a href="${BASE}/blog/${a.slug}">${escapeHtml(a.title)}</a>${a.excerpt ? ` — ${escapeHtml(a.excerpt)}` : ''}</li>`).join('')}</ul>`;
  const annivHtml = annivList.length === 0
    ? ''
    : `<h3>On this week in history</h3><ul>${annivList.map((a) => `<li>${a.years} years ago: <strong>${escapeHtml(a.title)}</strong> (${a.date})</li>`).join('')}</ul>`;

  const weekLabel = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(today);

  // 5. Send to each confirmed subscriber with their own unsubscribe token.
  const subscribers = await fetchAll<{ id: number; email: string; unsubscribe_token: string }>((from, to) =>
    admin.from('newsletter_subscribers')
      .select('id, email, unsubscribe_token')
      .eq('status', 'confirmed')
      .order('id')
      .range(from, to)
  );

  if (subscribers.length === 0) {
    return { started_at, finished_at: new Date().toISOString(), subject: '', subscriber_count: 0, errors, skipped_no_subscribers: true };
  }

  const subject = applyTemplate(tpl.subject, { week_label: weekLabel });
  let sent = 0;

  if (!opts.dryRun) {
    const resend = getResend();
    for (const sub of subscribers) {
      const unsubscribeUrl = `${BASE}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`;
      const html = applyTemplate(tpl.body_html, {
        week_label: weekLabel,
        intro_html: factsHtml ? `<ul>${factsHtml}</ul>` : '<p style="color:#888;">A quiet week.</p>',
        articles_html: articlesHtml,
        events_html: annivHtml,
        unsubscribe_url: unsubscribeUrl,
      });
      try {
        await resend.emails.send({ from: FROM, to: sub.email, subject, html });
        await admin.from('newsletter_subscribers').update({ last_emailed_at: new Date().toISOString() }).eq('id', sub.id);
        sent++;
      } catch (e) {
        errors.push({ email: sub.email, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  // Log the digest run.
  const sampleHtml = applyTemplate(tpl.body_html, {
    week_label: weekLabel,
    intro_html: factsHtml ? `<ul>${factsHtml}</ul>` : '<p>A quiet week.</p>',
    articles_html: articlesHtml,
    events_html: annivHtml,
    unsubscribe_url: '{{unsubscribe_url}}',
  });
  await admin.from('newsletter_digests').insert({
    subject, body_html: sampleHtml, subscriber_count: sent, errors,
  });

  return { started_at, finished_at: new Date().toISOString(), subject, subscriber_count: sent, errors };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
