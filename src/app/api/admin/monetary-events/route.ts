import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('monetary_events')
    .insert({
      event_date: body.event_date,
      category: body.category,
      title: body.title,
      description: body.description ?? null,
      impact_summary: body.impact_summary ?? null,
      related_metric_keys: body.related_metric_keys ?? [],
      source_url: body.source_url ?? null,
      created_by: auth.ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
