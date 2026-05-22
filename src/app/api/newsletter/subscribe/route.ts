import { NextResponse } from 'next/server';
import { subscribe } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '');
  const source = String(body.source ?? 'homepage');
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  const result = await subscribe(email, source);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
