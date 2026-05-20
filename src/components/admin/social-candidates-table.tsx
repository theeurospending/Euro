'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Candidate = {
  id: number;
  country_iso: string | null;
  rule_name: string;
  headline: string;
  supporting_data: Record<string, unknown>;
  priority_score: number;
  chart_type: string;
  detected_at: string;
  status: string;
};

export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | 'detect' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function detectNow() {
    setBusy('detect'); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/social-media/detect-now', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function act(id: number, action: 'promote' | 'dismiss') {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/admin/social-media/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={detectNow} disabled={busy !== null}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
          {busy === 'detect' ? 'Detecting + generating…' : 'Run detection now'}
        </button>
        <span className="text-xs text-zinc-500">{candidates.length} candidates shown</span>
      </div>

      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {result ? (
        <details className="mb-4 rounded border border-zinc-200 p-2 text-xs dark:border-zinc-800">
          <summary className="cursor-pointer font-medium">Last detection result</summary>
          <pre className="mt-2 overflow-auto rounded bg-zinc-900 p-3 text-zinc-100">{JSON.stringify(result, null, 2)}</pre>
        </details>
      ) : null}

      <div className="space-y-2">
        {candidates.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
            No candidates. Hit "Run detection now" to scan the database.
          </div>
        ) : candidates.map((c) => (
          <article key={c.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs text-zinc-500">
                  <span className="font-mono">{c.rule_name}</span>
                  <span>· {c.country_iso ?? 'EZ-wide'}</span>
                  <span>· priority {c.priority_score}</span>
                  <span>· chart {c.chart_type}</span>
                </div>
                <p className="mt-1 font-medium">{c.headline}</p>
                <details className="mt-1 text-xs text-zinc-500">
                  <summary className="cursor-pointer">Supporting data</summary>
                  <pre className="mt-1 overflow-auto rounded bg-zinc-50 p-2 dark:bg-zinc-900">{JSON.stringify(c.supporting_data, null, 2)}</pre>
                </details>
              </div>
              {c.status === 'new' && (
                <div className="ml-3 flex shrink-0 gap-1">
                  <button onClick={() => act(c.id, 'promote')} disabled={busy === c.id}
                          className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                    {busy === c.id ? '…' : 'Promote'}
                  </button>
                  <button onClick={() => act(c.id, 'dismiss')} disabled={busy === c.id}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
