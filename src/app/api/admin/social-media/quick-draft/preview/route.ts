import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const url = new URL(request.url);
  const country = url.searchParams.get('country') ?? '';
  const metric = url.searchParams.get('metric') ?? '';
  if (!country || !metric) return NextResponse.json({ error: 'country and metric required' }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('economic_data_points')
    .select('period_start, value')
    .eq('country_iso', country)
    .eq('metric_key', metric)
    .order('period_start', { ascending: true })
    .limit(60);

  return NextResponse.json({ series: data ?? [] });
}
