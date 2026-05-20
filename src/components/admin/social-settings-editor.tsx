'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SettingValue = { value: unknown; description: string | null };

export function SocialSettingsEditor({ settings }: { settings: Record<string, SettingValue> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [webhook, setWebhook] = useState<string>(typeof settings['social.make_webhook_url']?.value === 'string' ? settings['social.make_webhook_url'].value as string : '');
  const [platforms, setPlatforms] = useState<string>(
    Array.isArray(settings['social.default_platforms']?.value) ? (settings['social.default_platforms'].value as string[]).join(', ') : 'instagram, x'
  );
  const [draftCap, setDraftCap] = useState<string>(String(settings['social.weekly_draft_cap']?.value ?? 20));
  const [cronEnabled, setCronEnabled] = useState<boolean>(settings['social.cron_enabled']?.value !== false);

  async function save() {
    setBusy(true); setError(null); setSaved(null);
    try {
      const updates = [
        { key: 'social.make_webhook_url', value: webhook },
        { key: 'social.default_platforms', value: platforms.split(',').map((s) => s.trim()).filter(Boolean) },
        { key: 'social.weekly_draft_cap', value: parseInt(draftCap, 10) || 20 },
        { key: 'social.cron_enabled', value: cronEnabled },
      ];
      const res = await fetch('/api/admin/social-media/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSaved(new Date().toLocaleTimeString());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Field label="Make.com webhook URL" hint="POSTs each scheduled draft here. Leave empty to disable publishing.">
        <input type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)} className={inputClass} placeholder="https://hook.eu1.make.com/..." />
      </Field>

      <Field label="Default platforms" hint="Comma-separated list applied to new drafts. e.g. instagram, x">
        <input type="text" value={platforms} onChange={(e) => setPlatforms(e.target.value)} className={inputClass} />
      </Field>

      <Field label="Weekly draft cap" hint="Max number of drafts auto-generated per detect-now run.">
        <input type="number" value={draftCap} onChange={(e) => setDraftCap(e.target.value)} className={inputClass} min={1} max={100} />
      </Field>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={cronEnabled} onChange={(e) => setCronEnabled(e.target.checked)} />
        <span className="text-sm">Cron publishing enabled (the every-15-min cron will pick up scheduled drafts)</span>
      </label>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-xs text-zinc-500">Saved at {saved}</span>}
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
