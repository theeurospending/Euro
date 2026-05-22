// Per-metric CSV: all countries × periods for the requested metric.

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

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const admin = createSupabaseAdminClient();
  const { data: metric } = await admin
    .from('metrics').select('key, display_name, unit, category').eq('key', key).maybeSingle();
  if (!metric) notFound();

  const rows = await fetchAll<{
    country_iso: string; period_start: string; period_end: string | null;
    value: number; unit: string; source: string; is_estimate: boolean; is_forecast: boolean;
  }>((from, to) =>
    admin.from('economic_data_points')
      .select('country_iso, period_start, period_end, value, unit, source, is_estimate, is_forecast')
      .eq('metric_key', metric.key)
      .order('country_iso', { ascending: true })
      .order('period_start', { ascending: true })
      .range(from, to)
  );

  const lines = ['country_iso,metric_key,metric_name,period_start,period_end,value,unit,source,is_estimate,is_forecast'];
  for (const r of rows) {
    lines.push([
      r.country_iso, metric.key, metric.display_name, r.period_start, r.period_end ?? '',
      r.value, r.unit, r.source, r.is_estimate, r.is_forecast,
    ].map(escapeCsv).join(','));
  }
  const csv = lines.join('\n') + '\n';

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="eurospending-${key}.csv"`,
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
