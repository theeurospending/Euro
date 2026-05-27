import type { Metadata } from 'next';
import { loadEuroPageData } from '@/lib/euro-page-data';
import { EuroView } from '@/components/euro/euro-view';
import { SiteHeader } from '@/components/layout/site-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The euro — debasement, inflation, rates',
  description: 'The full story of the euro currency from 1999 to today: ECB rates, balance sheet, money supply, EUR/USD, inflation, gold and Bitcoin, and how the eurozone compares with the US, China, India and Japan.',
};

export default async function EuroPage() {
  const data = await loadEuroPageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10 text-[var(--brand-navy)]">
        <div className="kicker">The euro · 1999 → today</div>
        <h1 className="font-display mt-4 text-5xl tracking-tight sm:text-6xl">The euro</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--brand-navy)]/75">
          How the single currency was built, broken, and held together — the policy timeline and rate
          cycle, what a euro buys over time, and how the eurozone measures up against the other major economies.
        </p>

        <EuroView data={data} />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'The euro — debasement, inflation, rates',
          url: 'https://eurospending.org/euro',
        }) }} />
      </main>
    </>
  );
}
