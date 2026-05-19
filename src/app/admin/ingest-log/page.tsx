import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type IngestLogRow = {
  id: number;
  source_name: string;
  started_at: string;
  finished_at: string | null;
  rows_added: number;
  rows_updated: number;
  rows_unchanged: number;
  rows_rejected: number;
  errors: { message: string }[] | null;
  triggered_by: string;
};

export default async function IngestLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
  const PER_PAGE = 50;
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const admin = createSupabaseAdminClient();
  const { data, count, error } = await admin
    .from('ingest_run_log')
    .select('*', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as IngestLogRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ingest log</h1>
          <p className="mt-1 text-sm text-zinc-500">{count ?? 0} runs · newest first</p>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Started</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Trigger</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">No ingest runs yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                <td className="px-3 py-2 text-xs">
                  <div>{new Date(r.started_at).toLocaleString()}</div>
                  {r.finished_at && (
                    <div className="text-zinc-400">{durationMs(r.started_at, r.finished_at)} ms</div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.source_name}</td>
                <td className="px-3 py-2 text-xs">{r.triggered_by}</td>
                <td className="px-3 py-2 text-xs">
                  <span className="text-green-700">+{r.rows_added}</span>
                  {' '}<span className="text-blue-700">~{r.rows_updated}</span>
                  {' '}<span className="text-zinc-500">={r.rows_unchanged}</span>
                  {r.rows_rejected > 0 && <> <span className="text-amber-700">✗{r.rows_rejected}</span></>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {!r.errors?.length ? <span className="text-zinc-400">none</span> : (
                    <details>
                      <summary className="cursor-pointer text-red-700">{r.errors.length} error{r.errors.length === 1 ? '' : 's'}</summary>
                      <ul className="mt-1 list-disc pl-4 text-zinc-500">
                        {r.errors.slice(0, 20).map((e, i) => <li key={i}>{e.message}</li>)}
                        {r.errors.length > 20 && <li className="text-zinc-400">…and {r.errors.length - 20} more</li>}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 text-sm">
          {page > 1 && <Link href={`/admin/ingest-log?page=${page - 1}`} className="underline">← Prev</Link>}
          <span className="text-zinc-500">Page {page} / {totalPages}</span>
          {page < totalPages && <Link href={`/admin/ingest-log?page=${page + 1}`} className="underline">Next →</Link>}
        </div>
      )}
    </main>
  );
}

function durationMs(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}
