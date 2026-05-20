import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ iso: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const { iso: isoRaw } = await params;
  const iso = isoRaw.toUpperCase();
  const body = await request.json().catch(() => ({}));

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('country_narratives')
    .upsert({
      country_iso: iso,
      intro_html: body.intro_html ?? '',
      fiscal_context_html: body.fiscal_context_html ?? '',
      macro_context_html: body.macro_context_html ?? '',
      current_situation_html: body.current_situation_html ?? '',
      updated_at: new Date().toISOString(),
      updated_by: auth.ctx.userId,
    }, { onConflict: 'country_iso' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
