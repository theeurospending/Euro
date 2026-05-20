import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { QuickDraftForm } from '@/components/admin/quick-draft-form';

export const dynamic = 'force-dynamic';

export default async function QuickDraftPage() {
  const admin = createSupabaseAdminClient();
  const [{ data: countries }, { data: metrics }] = await Promise.all([
    admin.from('countries').select('iso_code, name, flag_emoji, is_eu_member, is_eurozone_member, is_aggregate, display_order').order('display_order'),
    admin.from('metrics').select('key, display_name, unit, frequency').eq('is_active', true).order('display_order'),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quick draft</h1>
          <p className="mt-1 text-sm text-zinc-500">Reactive content: pick a country + metric, write what's trending, generate a draft.</p>
        </div>
        <Link href="/admin/social-media/drafts" className="text-sm text-blue-700 hover:underline">← Drafts</Link>
      </div>

      <QuickDraftForm countries={countries ?? []} metrics={metrics ?? []} />
    </main>
  );
}
