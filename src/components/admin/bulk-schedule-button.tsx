'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Generates up to N drafts then auto-schedules unscheduled drafts at 08:00 &
// 17:00 London time across the next `days` days. Generation is candidate-limited
// and slow; if it times out, lower "generate" (or set 0 to schedule only) and
// re-run — scheduling is idempotent and fills remaining slots.
export function BulkScheduleButton() {
  const router = useRouter();
  const [generate, setGenerate] = useState(100);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/admin/social-media/bulk-schedule', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generate, days }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-zinc-500">
          Generate up to
          <input type="number" min={0} max={200} value={generate}
            onChange={(e) => setGenerate(Number(e.target.value))}
            className="ml-2 w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <label className="text-xs text-zinc-500">
          Schedule across (days)
          <input type="number" min={1} max={120} value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="ml-2 w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        </label>
        <button onClick={run} disabled={busy}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
          {busy ? 'Working…' : 'Generate + schedule (08:00 & 17:00 London)'}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Slots two posts per day. Generation is limited by how many newsworthy facts exist; if it times out, set Generate to 0 to schedule existing drafts only, or lower it and re-run (scheduling is idempotent).
      </p>
      {error && <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {result && (
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
