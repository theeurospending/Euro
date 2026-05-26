// Generate up to N social drafts, then auto-schedule unscheduled drafts into
// the next `days` days at 08:00 and 17:00 London time. Idempotent on re-run.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { runSocialBulkSchedule } from '@/lib/runners/social-bulk-schedule-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const generateTarget = Number.isFinite(body.generate) ? Number(body.generate) : 100;
  const days = Number.isFinite(body.days) ? Number(body.days) : 30;

  const summary = await runSocialBulkSchedule({ generateTarget, days });
  return NextResponse.json(summary);
}
