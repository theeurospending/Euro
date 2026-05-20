import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SocialSettingsEditor } from '@/components/admin/social-settings-editor';

export const dynamic = 'force-dynamic';

const KEYS = [
  'social.make_webhook_url',
  'social.default_platforms',
  'social.weekly_draft_cap',
  'social.cron_enabled',
] as const;

export default async function SocialSettings() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from('admin_settings').select('key, value, description').in('key', KEYS as unknown as string[]);
  const settings: Record<string, { value: unknown; description: string | null }> = {};
  for (const row of data ?? []) settings[row.key] = { value: row.value, description: row.description };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Social settings</h1>
        <div className="flex gap-2">
          <Link href="/admin/social-media/drafts" className="text-sm text-blue-700 hover:underline">← Drafts</Link>
          <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
        </div>
      </div>

      <SocialSettingsEditor settings={settings} />

      <div className="mt-10 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="font-medium">Make.com webhook payload reference</h2>
        <p className="mt-1 text-xs text-zinc-500">Our runner POSTs this JSON to your webhook URL:</p>
        <pre className="mt-2 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">{`{
  "draft_id": 123,
  "country_iso": "DE",
  "caption": "<text>",
  "image_url": "https://...png",
  "platforms": ["instagram", "x"],
  "scheduled_at": "2026-05-20T12:00:00Z"
}`}</pre>
        <p className="mt-3 text-xs text-zinc-500">Expected response (optional but useful):</p>
        <pre className="mt-2 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">{`{
  "platforms": {
    "instagram": "ok",
    "x": "error: rate limited"
  }
}`}</pre>
      </div>
    </main>
  );
}
