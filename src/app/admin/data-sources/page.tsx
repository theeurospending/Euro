import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { DataSourcesTable } from '@/components/admin/data-sources-table';

export const dynamic = 'force-dynamic';

export default async function DataSourcesPage() {
  const admin = createSupabaseAdminClient();
  const { data: sources, error } = await admin
    .from('data_sources')
    .select('*')
    .order('source_name');

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data sources</h1>
          <p className="mt-1 text-sm text-zinc-500">Per-extractor status. "Run now" calls the same runner cron uses.</p>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Failed to load: {error.message}
        </div>
      )}

      <DataSourcesTable sources={sources ?? []} />
    </main>
  );
}
