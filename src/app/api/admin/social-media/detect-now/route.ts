import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { runSocialDraftGeneration } from '@/lib/runners/social-draft-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const summary = await runSocialDraftGeneration();
  return NextResponse.json(summary);
}
