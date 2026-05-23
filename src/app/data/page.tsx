import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SiteHeader } from '@/components/layout/site-header';
import { MetricInfoLink } from '@/components/ui/metric-info-link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Open data — CSV downloads',
  description: 'Download every EUROSPENDING dataset as CSV. Per country, per metric. Public domain.',
};

export default async function DataPage() {
  const admin = createSupabaseAdminClient();
  const [{ data: countries }, { data: metrics }] = await Promise.all([
    admin.from('countries').select('iso_code, name, slug, flag_emoji, is_aggregate, is_eu_member, display_order').order('display_order'),
    admin.from('metrics').select('key, display_name, unit, category').eq('is_active', true).order('display_order'),
  ]);

  const byCategory = new Map<string, typeof metrics>();
  for (const m of metrics ?? []) {
    const arr = byCategory.get(m.category) ?? [];
    arr.push(m);
    byCategory.set(m.category, arr);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10 text-[var(--brand-navy)]">
        <div className="kicker">Open data · CSV</div>
        <h1 className="font-display mt-3 text-5xl tracking-tight">Bulk downloads</h1>
        <p className="mt-4 max-w-2xl text-[var(--brand-navy)]/80">
          Every metric, every country, every period. CSV with one row per observation. Source attribution included.
          Refreshed daily/weekly/monthly via cron from Eurostat, ECB, and IMF.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl">By country</h2>
          <p className="mt-1 text-sm text-[var(--brand-navy)]/60">All ~30 metrics × all available periods, one file per country.</p>
          <div className="surface mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-left font-mono text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2">Country</th>
                  <th className="px-4 py-2">ISO</th>
                  <th className="px-4 py-2 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {(countries ?? []).filter((c) => !c.is_aggregate).map((c) => (
                  <tr key={c.iso_code} className="border-t border-white/5">
                    <td className="px-4 py-2"><span className="mr-2">{c.flag_emoji}</span>{c.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-400">{c.iso_code}</td>
                    <td className="px-4 py-2 text-right">
                      <a href={`/api/export/country/${c.slug}`} className="font-mono text-xs text-[var(--brand-lav)] hover:underline">
                        {c.slug}.csv ↓
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">By metric</h2>
          <p className="mt-1 text-sm text-[var(--brand-navy)]/60">One file per metric covering every country with available data.</p>
          {[...byCategory.entries()].map(([cat, ms]) => (
            <div key={cat} className="mt-6">
              <div className="kicker">{cat.replace('_', ' ')}</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(ms ?? []).map((m) => (
                  <div
                    key={m.key}
                    className="surface flex items-center justify-between gap-2 p-3 transition-colors hover:border-[var(--brand-gold)]/40"
                  >
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-sm text-white">{m.display_name}</span>
                      <MetricInfoLink metricKey={m.key} />
                      <span className="font-mono text-xs text-slate-400">{m.unit}</span>
                    </span>
                    <a href={`/api/export/metric/${m.key}`} className="font-mono text-xs text-[var(--brand-lav)] hover:underline">
                      {m.key}.csv ↓
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl">Citation</h2>
          <p className="mt-3 text-sm text-[var(--brand-navy)]/80">
            If you use these datasets, attribute the underlying sources (Eurostat, ECB, IMF World Economic Outlook)
            and link back to <code className="font-mono text-[var(--brand-navy)]">eurospending.org</code>.
            The reformatting and aggregation work is licensed{' '}
            <a href="https://creativecommons.org/publicdomain/zero/1.0/" className="underline">CC0 (public domain)</a>.
          </p>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Eurospending — Open data',
          description: 'EU economic time-series harvested from Eurostat, ECB, and IMF.',
          url: 'https://eurospending.org/data',
          license: 'https://creativecommons.org/publicdomain/zero/1.0/',
          creator: { '@type': 'Organization', name: 'Eurospending' },
          distribution: [
            { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://eurospending.org/api/export/country/{slug}' },
            { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://eurospending.org/api/export/metric/{key}' },
          ],
        }) }} />
      </main>
    </>
  );
}
