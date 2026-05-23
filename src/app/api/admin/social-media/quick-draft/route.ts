// Manual quick-draft creator. Composes a CandidateFact in-line, runs caption
// generation + chart rendering, inserts a draft row (no candidate row).

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateCaption } from '@/lib/social/caption-generator';
import { renderInfographicPng, selectInfographicTemplate } from '@/lib/social/infographics';
import type { CandidateFact, DataPoint } from '@/lib/social/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const countryIso = String(body.country_iso ?? '').toUpperCase();
  const metricKey = String(body.metric_key ?? '');
  const trendingNote = String(body.trending_note ?? '');
  const headlineOverride = body.headline_override ? String(body.headline_override) : null;
  if (!countryIso || !metricKey) return NextResponse.json({ error: 'country_iso and metric_key required' }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Pull country + metric metadata + last 24 data points.
  const [{ data: country }, { data: metric }, { data: points }] = await Promise.all([
    admin.from('countries').select('iso_code, name, flag_emoji').eq('iso_code', countryIso).maybeSingle(),
    admin.from('metrics').select('key, display_name, unit').eq('key', metricKey).maybeSingle(),
    admin.from('economic_data_points')
      .select('period_start, value, is_forecast')
      .eq('country_iso', countryIso)
      .eq('metric_key', metricKey)
      .eq('is_forecast', false)
      .order('period_start', { ascending: true })
      .limit(48),
  ]);
  if (!country) return NextResponse.json({ error: 'unknown country' }, { status: 400 });
  if (!metric) return NextResponse.json({ error: 'unknown metric' }, { status: 400 });
  const series = (points ?? []).map((p) => ({ period_start: p.period_start, value: Number(p.value) }));
  if (series.length === 0) return NextResponse.json({ error: 'no data for this country+metric combo' }, { status: 400 });

  const latest = series[series.length - 1];
  const prior = series[series.length - 2];

  const headline = headlineOverride
    ?? `${country.name} ${metric.display_name}: ${latest.value.toFixed(2)} ${metric.unit} as of ${latest.period_start.slice(0, 7)}`;

  const fact: CandidateFact = {
    country_iso: countryIso,
    rule_name: 'quick_draft',
    headline,
    supporting_data: {
      metric: metric.key,
      period: latest.period_start,
      value: latest.value,
      prior_value: prior?.value ?? null,
      trending_note: trendingNote || undefined,
    },
    priority_score: 100,  // manual = max priority
    chart_type: 'line',
  };

  try {
    const caption = await generateCaption(fact, 'instagram');
    const template = selectInfographicTemplate(fact, series as DataPoint[]);
    const png = await renderInfographicPng(template, {
      fact,
      series: series as DataPoint[],
      unit: metric.unit,
      country_label: `${country.name} ${country.flag_emoji ?? ''}`.trim(),
    });
    const key = `quick-draft/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from('social-images').upload(key, new Uint8Array(png), {
      contentType: 'image/png', cacheControl: '31536000', upsert: false,
    });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { data: pub } = admin.storage.from('social-images').getPublicUrl(key);

    const { data: draft, error: insErr } = await admin.from('social_media_drafts').insert({
      candidate_id: null,
      post_type: 'chart',
      country_iso: countryIso,
      caption,
      image_url: pub.publicUrl,
      chart_data: { rule: 'quick_draft', template, supporting_data: fact.supporting_data, series: series.slice(-24) },
      status: 'draft',
      platforms: ['instagram', 'x'],
    }).select('id').single();
    if (insErr) throw new Error(`insert draft: ${insErr.message}`);

    return NextResponse.json({ ok: true, draft_id: draft.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
