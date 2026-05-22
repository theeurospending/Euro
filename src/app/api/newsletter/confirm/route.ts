import { NextResponse } from 'next/server';
import { confirm } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) return NextResponse.redirect(new URL('/newsletter?error=missing-token', request.url));
  const result = await confirm(token);
  if (!result.ok) return NextResponse.redirect(new URL(`/newsletter?error=${encodeURIComponent(result.error)}`, request.url));
  return NextResponse.redirect(new URL(`/newsletter?confirmed=1&email=${encodeURIComponent(result.email)}`, request.url));
}
