// Cron entrypoint for scheduled publishing — blog AND social media.

import { NextResponse } from 'next/server';
import { runScheduledPublish } from '@/lib/runners/scheduled-publish-runner';
import { runSocialPublish } from '@/lib/runners/social-publish-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorised(request: Request): boolean {
  const provided = request.headers.get('x-ingest-api-key') ?? '';
  const expected = process.env.INGEST_API_KEY ?? '';
  if (!expected) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const [blog, social] = await Promise.all([
    runScheduledPublish(),
    runSocialPublish(),
  ]);
  return NextResponse.json({ ok: true, blog, social });
}
