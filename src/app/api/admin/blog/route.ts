import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.slug) {
    return NextResponse.json({ error: 'title and slug required' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const status = body.status ?? 'draft';
  const { data, error } = await admin.from('blog_articles').insert({
    slug: body.slug,
    title: body.title,
    excerpt: body.excerpt ?? null,
    body_html: body.body_html ?? '',
    cover_image_url: body.cover_image_url || null,
    tags: body.tags ?? [],
    status,
    scheduled_at: status === 'scheduled' ? body.scheduled_at : null,
    published_at: status === 'published' ? now : null,
    seo_meta: body.seo_meta ?? {},
    author_id: auth.ctx.userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
