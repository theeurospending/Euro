// Per-country CSV: all metrics × periods for the requested country.
// Pages around the PostgREST 1000-row cap.

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { fetchAll } from '@/lib/supabase/paginate';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function escapeCsv(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createSupabaseAdminClient();
  const { data: country } = await admin
    .from('countries').select('iso_code, name').eq('slug', slug).maybeSingle();
  if (!country) notFound();

  const rows = await fetchAll<{
    metric_key: string; period_start: string; period_end: string | null;
    value: number; unit: string; source: string; is_estimate: boolean; is_forecast: boolean;
  }>((from, to) =>
    admin.from('economic_data_points')
      .select('metric_key, period_start, period_end, value, unit, source, is_estimate, is_forecast')
      .eq('country_iso', country.iso_code)
      .order('metric_key', { ascending: true })
      .order('period_start', { ascending: true })
      .range(from, to)
  );

  const lines = ['country_iso,country_name,metric_key,period_start,period_end,value,unit,source,is_estimate,is_forecast'];
  for (const r of rows) {
    lines.push([
      country.iso_code, country.name, r.metric_key, r.period_start, r.period_end ?? '',
      r.value, r.unit, r.source, r.is_estimate, r.is_forecast,
    ].map(escapeCsv).join(','));
  }
  const csv = lines.join('\n') + '\n';

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="eurospending-${slug}.csv"`,
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
