import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'blog-images';
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status });

  const fd = await request.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large (max 8 MB)' }, { status: 413 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'not an image' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'bin';
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(key, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: pub.publicUrl, key });
}
