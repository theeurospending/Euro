// Edit / delete / post-now for individual social drafts. The actual posting
// is a stub here — Session 10 will wire it to a Make.com webhook.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const admin = createSupabaseAdminClient();

  if (body.action === 'post_now') {
    // Stub for Session 10: just mark posted with a placeholder.
    const { error } = await admin.from('social_media_drafts')
      .update({ status: 'posted', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, note: 'Session 10 will wire Make.com webhook here' });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.caption === 'string') updates.caption = body.caption;
  if (typeof body.scheduled_at === 'string') updates.scheduled_at = body.scheduled_at;
  if (typeof body.status === 'string') updates.status = body.status;
  if (Array.isArray(body.platforms)) updates.platforms = body.platforms;

  const { data, error } = await admin.from('social_media_drafts').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('social_media_drafts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
