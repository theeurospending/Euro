import { NextResponse } from 'next/server';
import { unsubscribe } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) return NextResponse.redirect(new URL('/newsletter?error=missing-token', request.url));
  const result = await unsubscribe(token);
  if (!result.ok) return NextResponse.redirect(new URL(`/newsletter?error=${encodeURIComponent(result.error)}`, request.url));
  return NextResponse.redirect(new URL('/newsletter?unsubscribed=1', request.url));
}
