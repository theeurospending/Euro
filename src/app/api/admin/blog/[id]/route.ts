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
  const now = new Date().toISOString();
  const status = body.status ?? 'draft';

  // If transitioning to published and published_at was null, set it now.
  const updates: Record<string, unknown> = {
    slug: body.slug,
    title: body.title,
    excerpt: body.excerpt ?? null,
    body_html: body.body_html ?? '',
    cover_image_url: body.cover_image_url || null,
    tags: body.tags ?? [],
    status,
    scheduled_at: status === 'scheduled' ? body.scheduled_at : null,
    seo_meta: body.seo_meta ?? {},
    updated_at: now,
  };
  if (status === 'published') updates.published_at = body.published_at ?? now;

  const { data, error } = await admin.from('blog_articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

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
  const { error } = await admin.from('blog_articles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
