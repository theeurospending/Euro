// Newsletter subscriber + digest helpers.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getResend, applyTemplate } from '@/lib/email';

const FROM = 'Eurospending <hello@eurospending.org>';
const BASE = 'https://eurospending.org';

function randomToken(len = 32): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, len);
}

export async function subscribe(email: string, source = 'homepage'): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleaned = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return { ok: false, error: 'Invalid email address' };

  const admin = createSupabaseAdminClient();
  const token = randomToken();

  // Upsert: existing emails get a refreshed confirm token + status reset to pending.
  const { error: upsertErr } = await admin.from('newsletter_subscribers').upsert({
    email: cleaned,
    status: 'pending',
    confirm_token: token,
    source,
  }, { onConflict: 'email' });
  if (upsertErr) return { ok: false, error: upsertErr.message };

  const { data: tpl } = await admin.from('email_templates').select('subject, body_html').eq('key', 'newsletter_confirm').maybeSingle();
  if (!tpl) return { ok: false, error: 'confirm template missing' };

  const confirmUrl = `${BASE}/api/newsletter/confirm?token=${token}`;
  const html = applyTemplate(tpl.body_html, { confirm_url: confirmUrl });

  try {
    const resend = getResend();
    await resend.emails.send({ from: FROM, to: cleaned, subject: tpl.subject, html });
  } catch (e) {
    // Don't leak Resend errors — but keep the pending row so a retry is possible.
    return { ok: false, error: e instanceof Error ? e.message : 'email send failed' };
  }

  return { ok: true };
}

export async function confirm(token: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from('newsletter_subscribers')
    .select('id, email, status')
    .eq('confirm_token', token)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Invalid or already-used token.' };

  const { error } = await admin
    .from('newsletter_subscribers')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirm_token: null })
    .eq('id', row.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true, email: row.email };
}

export async function unsubscribe(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from('newsletter_subscribers').select('id').eq('unsubscribe_token', token).maybeSingle();
  if (!row) return { ok: false, error: 'Invalid unsubscribe link.' };
  const { error } = await admin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
    .eq('id', row.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
