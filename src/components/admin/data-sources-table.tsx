'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DataSource = {
  source_name: string;
  category: string;
  description: string | null;
  frequency: string;
  metric_keys: string[];
  enabled: boolean;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
  last_run_status: string | null;
  last_run_summary: Record<string, unknown> | null;
  consecutive_failures: number;
};

export function DataSourcesTable({ sources }: { sources: DataSource[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function runOne(name: string) {
    await invoke(name, [name]);
  }
  async function runAll() {
    await invoke('all', sources.filter((s) => s.enabled).map((s) => s.source_name));
  }
  async function invoke(label: string, sourceNames: string[]) {
    setBusy(label);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/ingest/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_names: sourceNames }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLastResult(json);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={runAll}
          disabled={busy !== null}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {busy === 'all' ? 'Running all…' : 'Run all enabled'}
        </button>
        <span className="text-xs text-zinc-500">
          {sources.filter((s) => s.enabled).length} enabled · {sources.length} total
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Frequency</th>
              <th className="px-3 py-2 font-medium">Last run</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Failures</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_name} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <div className="font-mono text-xs">{s.source_name}</div>
                  <div className="text-xs text-zinc-500">{s.description ?? ''}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {s.metric_keys?.length ? `${s.metric_keys.length} metric${s.metric_keys.length === 1 ? '' : 's'}: ${s.metric_keys.join(', ')}` : ''}
                  </div>
                </td>
                <td className="px-3 py-2 align-top">{s.frequency}</td>
                <td className="px-3 py-2 align-top text-xs">{s.last_run_finished_at ? new Date(s.last_run_finished_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 align-top text-xs">
                  {s.last_run_status === 'ok' && <span className="text-green-700">ok</span>}
                  {s.last_run_status === 'error' && <span className="text-red-700">error</span>}
                  {!s.last_run_status && <span className="text-zinc-400">—</span>}
                  {s.last_run_summary ? (
                    <div className="text-zinc-500">{summary(s.last_run_summary)}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top text-xs">{s.consecutive_failures}</td>
                <td className="px-3 py-2 align-top">
                  <button
                    onClick={() => runOne(s.source_name)}
                    disabled={busy !== null || !s.enabled}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {busy === s.source_name ? 'Running…' : 'Run now'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastResult ? (
        <details open className="mt-6">
          <summary className="cursor-pointer text-sm font-medium">Last run result</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">{JSON.stringify(lastResult, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}

function summary(obj: Record<string, unknown>): string {
  const a = num(obj.added);
  const u = num(obj.updated);
  const un = num(obj.unchanged);
  const r = num(obj.rejected);
  const errs = Array.isArray(obj.errors) ? obj.errors.length : 0;
  return `+${a} ~${u} =${un} ✗${r}${errs ? ` · ${errs} err` : ''}`;
}
function num(v: unknown): number { return typeof v === 'number' ? v : 0; }
