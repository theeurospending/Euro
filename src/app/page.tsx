import type { Metadata } from 'next';
import Link from 'next/link';
import { loadHomepageData } from '@/lib/homepage-data';
import { EuropeMap } from '@/components/map/europe-map';
import { CountryTileGrid } from '@/components/map/country-tile-grid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Eurospending — how Europe spends, borrows, and inflates',
  description: 'Live tracker of every EU country\'s economic trajectory since 1999. Public spending, debt, deficits, inflation, growth — and the story of the euro.',
  openGraph: {
    title: 'Eurospending',
    description: 'How Europe spends, borrows, and inflates — country by country.',
    type: 'website',
  },
};

export default async function Home() {
  const data = await loadHomepageData();
  const ez = data.euroSnapshot;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <section className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Eurospending</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          How Europe spends, borrows, and inflates — country by country, year by year, since 1999.
          Pick a metric below to colour the map; click any country for the full story.
        </p>
      </section>

      {/* Map */}
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <EuropeMap countries={data.countries} />
      </section>

      {/* Tile grid */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">All EU countries</h2>
        <p className="mt-1 text-sm text-zinc-500">Sort by any metric. Click a card for full country page.</p>
        <div className="mt-4">
          <CountryTileGrid countries={data.countries} />
        </div>
      </section>

      {/* Euro snapshot */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Euro currency snapshot</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="ECB main refi rate" value={ez.ecb_main_refi_rate ? `${ez.ecb_main_refi_rate.value.toFixed(2)}%` : '—'} sub={ez.ecb_main_refi_rate?.period_start} />
          <MetricCard label="Eurozone HICP (YoY)" value={ez.eurozone_hicp_headline ? `${ez.eurozone_hicp_headline.value.toFixed(1)}%` : '—'} sub={ez.eurozone_hicp_headline?.period_start.slice(0, 7)} />
          <MetricCard label="EUR / USD" value={ez.eur_usd_rate ? ez.eur_usd_rate.value.toFixed(4) : '—'} sub={ez.eur_usd_rate?.period_start} />
        </div>
        {ez.latestEvent && (
          <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">Most recent monetary event · <span className="font-mono">{ez.latestEvent.event_date}</span> · {ez.latestEvent.category}</div>
            <div className="mt-1 font-semibold">{ez.latestEvent.title}</div>
            {ez.latestEvent.description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{ez.latestEvent.description}</p>}
          </div>
        )}
      </section>

      {/* Navigation cards */}
      <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NavCard href="/compare" title="Compare countries →" hint="Multi-country, multi-metric overlays" />
        <NavCard href="/euro"    title="The euro timeline →" hint="ECB rates, balance sheet, FX history with monetary events overlaid" />
        <NavCard href="/blog"    title="Blog →" hint="Analysis and commentary" />
      </section>

      {/* JSON-LD WebSite */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Eurospending',
        url: 'https://eurospending.org',
        description: 'Public tracker of EU economic data and the story of the euro.',
      }) }} />
    </main>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-400">as of {sub}</div>}
    </div>
  );
}

function NavCard({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{hint}</div>
    </Link>
  );
}
