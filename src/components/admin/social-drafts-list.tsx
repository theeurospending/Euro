'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Draft = {
  id: number;
  candidate_id: number | null;
  post_type: string;
  country_iso: string | null;
  caption: string;
  image_url: string | null;
  scheduled_at: string | null;
  status: string;
  platforms: string[];
  error_message: string | null;
  created_at: string;
  chart_data?: { template?: string } | null;
};

export function DraftsList({ drafts }: { drafts: Draft[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(id: number, body: Partial<Draft> & { action?: 'delete' | 'post_now' }) {
    setBusyId(id); setError(null);
    try {
      const res = await fetch(`/api/admin/social-media/drafts/${id}`, {
        method: body.action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: body.action === 'delete' ? undefined : JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusyId(null); }
  }

  if (drafts.length === 0) {
    return <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">No drafts.</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {drafts.map((d) => (
        <article key={d.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
            {d.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.image_url} alt="" className="aspect-square w-full max-w-[180px] rounded object-cover" />
            ) : (
              <div className="flex aspect-square w-full max-w-[180px] items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">no image</div>
            )}

            <div>
              <div className="text-xs text-zinc-500">
                <span className="font-mono">#{d.id}</span>
                {' · '}<span>{d.country_iso ?? 'EZ-wide'}</span>
                {' · '}<span>{d.chart_data?.template ?? d.post_type}</span>
                {' · '}<span>{d.status}</span>
                {' · '}<span>{d.platforms.join(', ')}</span>
              </div>
              <textarea
                defaultValue={d.caption}
                rows={4}
                className="mt-2 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                onBlur={(e) => { if (e.target.value !== d.caption) update(d.id, { caption: e.target.value }); }}
              />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  Schedule for:
                  <input
                    type="datetime-local"
                    defaultValue={d.scheduled_at?.slice(0, 16) ?? ''}
                    onBlur={(e) => { if (e.target.value) update(d.id, { scheduled_at: new Date(e.target.value).toISOString(), status: 'scheduled' }); }}
                    className="ml-2 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => update(d.id, { action: 'post_now' })} disabled={busyId === d.id || d.status === 'posted'}
                          className="rounded bg-zinc-900 px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                    {busyId === d.id ? '…' : 'Post now'}
                  </button>
                  <button onClick={() => update(d.id, { action: 'delete' })} disabled={busyId === d.id}
                          className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                    Delete
                  </button>
                </div>
              </div>
              {d.error_message && (
                <div className={`mt-2 text-xs ${d.status === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>
                  {d.status === 'failed' ? '✗ ' : '⚠ '}{d.error_message}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
