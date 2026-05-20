import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CountriesAdminList } from '@/components/admin/countries-list';

export const dynamic = 'force-dynamic';

export default async function AdminCountries() {
  const admin = createSupabaseAdminClient();
  const [{ data: countries }, { data: narratives }] = await Promise.all([
    admin.from('countries').select('iso_code, name, slug, flag_emoji, is_eu_member, is_eurozone_member, is_aggregate, display_order').order('display_order'),
    admin.from('country_narratives').select('country_iso, updated_at'),
  ]);
  const narrativeMap = new Map((narratives ?? []).map((n) => [n.country_iso, n.updated_at]));
  const enriched = (countries ?? []).map((c) => ({ ...c, narrative_updated_at: narrativeMap.get(c.iso_code) ?? null }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Countries</h1>
          <p className="mt-1 text-sm text-zinc-500">{enriched.length} entries · click to edit narrative.</p>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 underline">← Admin</Link>
      </div>
      <CountriesAdminList countries={enriched} />
    </main>
  );
}
