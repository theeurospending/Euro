import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { MonetaryEventsEditor } from '@/components/admin/monetary-events-editor';

export const dynamic = 'force-dynamic';

export default async function MonetaryEventsPage() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('monetary_events')
    .select('*')
    .order('event_date', { ascending: false });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monetary events</h1>
          <p className="mt-1 text-sm text-zinc-500">Editorial timeline events shown on the public /euro page.</p>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </div>
      )}

      <MonetaryEventsEditor initial={data ?? []} />
    </main>
  );
}
