import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { CountryNarrativeEditor } from '@/components/admin/country-narrative-editor';

export const dynamic = 'force-dynamic';

export default async function AdminCountryEdit({ params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const admin = createSupabaseAdminClient();

  const { data: country } = await admin
    .from('countries')
    .select('iso_code, name, slug, flag_emoji')
    .eq('iso_code', iso.toUpperCase())
    .maybeSingle();
  if (!country) notFound();

  const { data: narrative } = await admin
    .from('country_narratives')
    .select('*')
    .eq('country_iso', country.iso_code)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{country.flag_emoji} {country.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Editing narrative for {country.iso_code}.</p>
        </div>
        <Link href="/admin/countries" className="text-sm text-zinc-500 underline">← All countries</Link>
      </div>

      <CountryNarrativeEditor
        countryIso={country.iso_code}
        initial={{
          intro_html: narrative?.intro_html ?? '',
          fiscal_context_html: narrative?.fiscal_context_html ?? '',
          macro_context_html: narrative?.macro_context_html ?? '',
          current_situation_html: narrative?.current_situation_html ?? '',
        }}
      />
    </main>
  );
}
