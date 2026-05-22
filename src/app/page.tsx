import type { Metadata } from 'next';
import Link from 'next/link';
import { loadHomepageData } from '@/lib/homepage-data';
import { EuropeMap } from '@/components/map/europe-map';
import { CountryTileGrid } from '@/components/map/country-tile-grid';
import { SiteHeader } from '@/components/layout/site-header';
import { NewsletterForm } from '@/components/layout/newsletter-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Eurospending — Euro Economics',
  description: "Live tracker of every EU country's economic trajectory since 1999. Public spending, debt, deficits, inflation, growth — and the story of the euro.",
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
    <>
      <SiteHeader />
      <main className="text-[var(--brand-navy)]">
        {/* Hero */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
            <div className="kicker">Euro Economics · since 1999</div>
            <h1 className="font-display mt-4 text-5xl leading-[0.95] tracking-tight text-[var(--brand-navy)] sm:text-6xl lg:text-7xl">
              How Europe spends,<br />borrows, and inflates.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--brand-navy)]/75">
              Live tracker of every EU country&apos;s economic trajectory.
              Pick a metric to colour the map; click any country for the full story.
            </p>
          </div>
        </section>

        {/* Map */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="surface p-4 lg:p-6">
              <EuropeMap countries={data.countries} />
            </div>
          </div>
        </section>

        {/* Tile grid */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="kicker">EU 27</div>
            <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">All EU countries</h2>
            <p className="mt-2 text-sm text-[var(--brand-navy)]/60">Sort by any metric. Click a card for the full country page.</p>
            <div className="mt-8">
              <CountryTileGrid countries={data.countries} />
            </div>
          </div>
        </section>

        {/* Euro snapshot */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="kicker">Eurozone snapshot</div>
            <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">The currency, right now</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label="ECB main refi rate" value={ez.ecb_main_refi_rate ? `${ez.ecb_main_refi_rate.value.toFixed(2)}%` : '—'} sub={ez.ecb_main_refi_rate?.period_start} />
              <MetricCard label="Eurozone HICP (YoY)" value={ez.eurozone_hicp_headline ? `${ez.eurozone_hicp_headline.value.toFixed(1)}%` : '—'} sub={ez.eurozone_hicp_headline?.period_start.slice(0, 7)} />
              <MetricCard label="EUR / USD" value={ez.eur_usd_rate ? ez.eur_usd_rate.value.toFixed(4) : '—'} sub={ez.eur_usd_rate?.period_start} />
            </div>
            {ez.latestEvent && (
              <div className="surface mt-6 p-5">
                <div className="kicker">
                  <span className="font-mono">{ez.latestEvent.event_date}</span>
                  <span className="ml-3 text-[var(--brand-gold)]">{ez.latestEvent.category}</span>
                </div>
                <div className="mt-2 font-display text-xl">{ez.latestEvent.title}</div>
                {ez.latestEvent.description && <p className="mt-3 text-sm">{ez.latestEvent.description}</p>}
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="kicker">Weekly digest · Mondays 09:00 UTC</div>
                <h2 className="font-display mt-3 text-3xl text-[var(--brand-navy)]">The biggest moves, in your inbox</h2>
                <p className="mt-2 text-sm text-[var(--brand-navy)]/60">One email a week. No tracking, no nonsense. Unsubscribe any time.</p>
              </div>
              <div className="lg:w-96">
                <NewsletterForm source="homepage" />
              </div>
            </div>
          </div>
        </section>

        {/* Nav cards */}
        <section className="border-b border-[var(--brand-navy)]/10">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NavCard href="/compare" title="Compare countries" hint="Multi-country, multi-metric overlays" />
              <NavCard href="/euro"    title="The euro timeline" hint="ECB rates, balance sheet, FX history with monetary events overlaid" />
              <NavCard href="/data"    title="Open data" hint="CSV downloads per country and per metric" />
              <NavCard href="/blog"    title="Blog" hint="Analysis and commentary" />
            </div>
          </div>
        </section>

        <footer className="bg-[var(--brand-navy)] text-slate-300">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-8 font-mono text-xs">
            <div>eurospending.org · Brand Kit v1.0</div>
            <div>Data: Eurostat · ECB · IMF</div>
          </div>
        </footer>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Eurospending',
          url: 'https://eurospending.org',
          description: 'Public tracker of EU economic data and the story of the euro.',
        }) }} />
      </main>
    </>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface p-5">
      <div className="kicker text-xs">{label}</div>
      <div className="font-display mt-2 text-4xl">{value}</div>
      {sub && <div className="mt-1 font-mono text-xs text-slate-400">as of {sub}</div>}
    </div>
  );
}

function NavCard({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link href={href} className="surface group block p-5 transition-colors hover:border-[var(--brand-gold)]/40">
      <div className="font-display text-xl">{title} <span className="text-[var(--brand-gold)] transition-transform group-hover:translate-x-0.5">→</span></div>
      <div className="mt-2 text-sm text-slate-400">{hint}</div>
    </Link>
  );
}
