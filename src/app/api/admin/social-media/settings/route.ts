import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = new Set([
  'social.make_webhook_url',
  'social.default_platforms',
  'social.weekly_draft_cap',
  'social.cron_enabled',
]);

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const updates = (body.updates ?? []) as { key: string; value: unknown }[];

  const admin = createSupabaseAdminClient();
  const errors: string[] = [];
  for (const u of updates) {
    if (!ALLOWED_KEYS.has(u.key)) {
      errors.push(`disallowed key ${u.key}`);
      continue;
    }
    const { error } = await admin.from('admin_settings').upsert({
      key: u.key,
      value: u.value,
      updated_at: new Date().toISOString(),
      updated_by: auth.ctx.userId,
    }, { onConflict: 'key' });
    if (error) errors.push(`${u.key}: ${error.message}`);
  }
  if (errors.length > 0) return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  return NextResponse.json({ ok: true });
}
