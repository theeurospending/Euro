// Cron entrypoint for scheduled ingestion.
//
// Invoked internally by cf-worker.js's scheduled handler (NOT outbound fetch).
// Auth via X-Ingest-Api-Key header (matches Worker secret INGEST_API_KEY).
//
// Query param: ?cron=<cron-name> — looked up in CRON_TO_SOURCES below.

import { NextResponse } from 'next/server';
import { runIngest } from '@/lib/runners/ingest-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_TO_SOURCES: Record<string, string[]> = {
  // Daily 06:00 UTC: FX + ECB policy rates (Bund yield piggybacks via same extractor group).
  'daily-06': ['ecb:fm_rates_and_yield', 'ecb:exr_fx'],

  // Weekly Mon 07:00 UTC: balance sheet (weekly cadence).
  'weekly-mon-07': ['ecb:ilm_balance_sheet'],

  // Monthly 1st 08:00 UTC: monthly cadence sources + quarterly + non-EZ yields.
  // Quarterly Eurostat data drops once per quarter — running it monthly is harmless
  // (it re-checks and upserts unchanged), saves a cron slot.
  'monthly-1st-08': [
    'ecb:bsi_money_supply',
    'ecb:icp_hicp',
    'ecb:irs_sovereign_yields',
    'ecb:irs_non_ez_yields',
    'eurostat:prc_hicp_manr',
    'eurostat:une_rt_m',
    'eurostat:namq_10_gdp',
  ],

  // Annual 1 March 10:00 UTC: full annual Eurostat + IMF WEO refresh.
  'annual-march-10': [
    'eurostat:gov_10a_main',
    'eurostat:gov_10dd_edpt1',
    'eurostat:gov_10a_exp_cofog',
    'eurostat:nama_10_gdp',
    'eurostat:nama_10_pc',
    'eurostat:prc_hicp_aind',
    'eurostat:prc_hicp_aind_core',
    'eurostat:une_rt_a',
    'eurostat:demo_pjan',
    'eurostat:ilc_lvho07a',
    'imf:weo_forecasts',
  ],
};

function authorised(request: Request): boolean {
  const provided = request.headers.get('x-ingest-api-key') ?? '';
  const expected = process.env.INGEST_API_KEY ?? '';
  if (!expected) return false;
  if (provided.length !== expected.length) return false;
  // Constant-time compare via simple XOR; expected is a short shared secret, length already matched.
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const cron = new URL(request.url).searchParams.get('cron') ?? '';
  const sources = CRON_TO_SOURCES[cron];
  if (sources === undefined) {
    return NextResponse.json({ error: `unknown cron "${cron}"` }, { status: 400 });
  }
  if (sources.length === 0) {
    return NextResponse.json({ ok: true, cron, skipped: 'no sources mapped' });
  }

  const summary = await runIngest({
    sourceNames: sources,
    triggeredBy: 'cron',
  });

  return NextResponse.json({ ok: true, cron, summary });
}
