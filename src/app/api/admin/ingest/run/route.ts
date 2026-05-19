import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { runIngest } from '@/lib/runners/ingest-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  let body: { source_names?: string[]; since_year?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const summary = await runIngest({
    sourceNames: body.source_names,
    sinceYear: body.since_year,
    triggeredBy: 'admin',
  });

  return NextResponse.json(summary);
}
