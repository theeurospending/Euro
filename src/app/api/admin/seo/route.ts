import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  if (!body.path) return NextResponse.json({ error: 'path required' }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from('seo_overrides').upsert({
    path: body.path,
    title: body.title ?? null,
    description: body.description ?? null,
    og_image_url: body.og_image_url ?? null,
    updated_at: new Date().toISOString(),
    updated_by: auth.ctx.userId,
  }, { onConflict: 'path' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });
  const path = new URL(request.url).searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('seo_overrides').delete().eq('path', path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
