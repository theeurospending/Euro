// Google Drive service-account integration: hand-rolled JWT (RS256) + Drive v3 API.
// Workers don't ship with a JWT signing library, so we sign with Web Crypto.
//
// Required env (Worker secrets):
//   GOOGLE_DRIVE_CLIENT_EMAIL    — service account email
//   GOOGLE_DRIVE_PRIVATE_KEY     — PEM-formatted private key (with literal \n)
//   GOOGLE_DRIVE_FOLDER_IDS      — JSON map iso → drive folder id, e.g. {"DE":"1abc","FR":"1xyz"}

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY);
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/\\n/g, '\n')                     // literal "\n" in env
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(cleaned);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const pkPem = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (!email || !pkPem) throw new Error('Drive credentials missing');

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64url(new TextEncoder().encode(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pkPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${base64url(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive token exchange HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

function getFolderId(iso: string): string | null {
  const raw = process.env.GOOGLE_DRIVE_FOLDER_IDS;
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[iso] ?? null;
  } catch {
    return null;
  }
}

export type DriveImageRef = {
  driveFileId: string;
  name: string;
  mimeType: string;
};

/** List image files in a country's folder. */
export async function listCountryImages(iso: string): Promise<DriveImageRef[]> {
  const folderId = getFolderId(iso);
  if (!folderId) return [];
  const token = await getAccessToken();
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  url.searchParams.set('fields', 'files(id,name,mimeType)');
  url.searchParams.set('pageSize', '100');
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive list HTTP ${res.status}`);
  const json = await res.json() as { files: { id: string; name: string; mimeType: string }[] };
  return (json.files ?? []).map((f) => ({ driveFileId: f.id, name: f.name, mimeType: f.mimeType }));
}

/** Download a Drive file as an ArrayBuffer. */
export async function downloadDriveFile(fileId: string): Promise<ArrayBuffer> {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive download HTTP ${res.status}`);
  return await res.arrayBuffer();
}

/** Pick the least-recently-used image for a country, respecting use_count. */
export async function pickLruImageForCountry(iso: string): Promise<DriveImageRef | null> {
  const images = await listCountryImages(iso);
  if (images.length === 0) return null;
  const admin = createSupabaseAdminClient();
  const { data: usage } = await admin
    .from('social_photo_usage')
    .select('drive_file_id, use_count, last_used_at')
    .eq('country_iso', iso);
  const usageMap = new Map((usage ?? []).map((u) => [u.drive_file_id, u]));

  // Sort: never-used first, then least-recently-used, then lowest use_count.
  const scored = images.map((img) => {
    const u = usageMap.get(img.driveFileId);
    return { img, lastUsed: u?.last_used_at ? Date.parse(u.last_used_at) : 0, useCount: u?.use_count ?? 0 };
  });
  scored.sort((a, b) => {
    if (a.lastUsed !== b.lastUsed) return a.lastUsed - b.lastUsed;
    return a.useCount - b.useCount;
  });
  return scored[0]?.img ?? null;
}

/** Record that we used a photo (LRU bookkeeping). */
export async function markPhotoUsed(iso: string, driveFileId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from('social_photo_usage')
    .select('id, use_count')
    .eq('country_iso', iso).eq('drive_file_id', driveFileId).maybeSingle();
  if (existing) {
    await admin.from('social_photo_usage').update({ use_count: existing.use_count + 1, last_used_at: now }).eq('id', existing.id);
  } else {
    await admin.from('social_photo_usage').insert({ country_iso: iso, drive_file_id: driveFileId, use_count: 1, last_used_at: now });
  }
}
