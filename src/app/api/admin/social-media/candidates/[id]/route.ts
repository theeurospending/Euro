// Per-candidate promote / dismiss. Promote triggers single-candidate draft generation.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateCaption } from '@/lib/social/caption-generator';
import { renderInfographicPng, selectInfographicTemplate } from '@/lib/social/infographics';
import type { CandidateFact, DataPoint } from '@/lib/social/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = body.action as 'promote' | 'dismiss' | undefined;
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  const admin = createSupabaseAdminClient();

  if (action === 'dismiss') {
    const { error } = await admin.from('social_media_candidates').update({ status: 'dismissed', dismissed_reason: body.reason ?? null }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // promote: fetch candidate, generate caption + chart, create draft.
  const { data: c } = await admin.from('social_media_candidates').select('*').eq('id', id).maybeSingle();
  if (!c) return NextResponse.json({ error: 'candidate not found' }, { status: 404 });

  const fact: CandidateFact = {
    country_iso: c.country_iso,
    rule_name: c.rule_name,
    headline: c.headline,
    supporting_data: c.supporting_data,
    priority_score: c.priority_score,
    chart_type: c.chart_type,
  };

  try {
    const metric = (fact.supporting_data.metric ?? null) as string | null;
    let series: DataPoint[] = [];
    let unit = '';
    let country_label = 'Eurozone 🇪🇺';
    if (fact.country_iso) {
      const { data: cRow } = await admin.from('countries').select('name, flag_emoji').eq('iso_code', fact.country_iso).maybeSingle();
      if (cRow) country_label = `${cRow.name} ${cRow.flag_emoji ?? ''}`.trim();
    }
    if (metric && fact.country_iso) {
      const { data } = await admin.from('economic_data_points')
        .select('period_start, value')
        .eq('country_iso', fact.country_iso)
        .eq('metric_key', metric)
        .order('period_start', { ascending: true })
        .limit(48);
      series = (data ?? []).map((r) => ({ period_start: r.period_start, value: Number(r.value) }));
      const { data: m } = await admin.from('metrics').select('unit').eq('key', metric).maybeSingle();
      unit = m?.unit ?? '';
    }

    const caption = await generateCaption(fact, 'instagram');

    const template = selectInfographicTemplate(fact, series);
    const png = await renderInfographicPng(template, { fact, series, unit, country_label });
    const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage.from('social-images').upload(key, new Uint8Array(png), {
      contentType: 'image/png', cacheControl: '31536000', upsert: false,
    });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { data: pub } = admin.storage.from('social-images').getPublicUrl(key);
    const imageUrl = pub.publicUrl;

    await admin.from('social_media_drafts').insert({
      candidate_id: id,
      post_type: 'chart',
      country_iso: fact.country_iso,
      caption,
      image_url: imageUrl,
      chart_data: { rule: fact.rule_name, template, supporting_data: fact.supporting_data, series: series.slice(-24) },
      status: 'draft',
      platforms: ['instagram', 'x'],
    });
    await admin.from('social_media_candidates').update({ status: 'promoted' }).eq('id', id);
    return NextResponse.json({ ok: true, draft_created: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
