import type { Metadata } from 'next';
import { loadEuroPageData } from '@/lib/euro-page-data';
import { TimeSeriesLine } from '@/components/charts/time-series-line';
import { PALETTE, nthCountryColor } from '@/components/charts/palette';
import { EventTimeline } from '@/components/euro/event-timeline';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The euro — debasement, inflation, rates',
  description: 'The full story of the euro currency from 1999 to today: ECB rates, balance sheet, M2, EUR/USD, inflation, and the events that shaped them.',
};

export default async function EuroPage() {
  const data = await loadEuroPageData();

  // Convert events to ReferenceLine markers for the rate chart.
  const rateMarkers = data.events
    .filter((e) => e.category === 'rate_change' || e.category === 'qe')
    .map((e) => ({
      date: e.event_date,
      label: e.title.length > 22 ? `${e.title.slice(0, 22)}…` : e.title,
      color: PALETTE.warning,
    }));

  const hicpMarkers = data.events
    .filter((e) => e.category === 'crisis' || e.category === 'rate_change')
    .map((e) => ({
      date: e.event_date,
      label: e.title.length > 22 ? `${e.title.slice(0, 22)}…` : e.title,
      color: PALETTE.negative,
    }));

  // Sovereign yields — Bund vs peripherals
  const yieldsSeries = data.sovereignYields.map((s, i) => ({
    label: s.country_name,
    color: s.country_iso === 'DE' ? PALETTE.primary : nthCountryColor(i + 1),
    data: s.data,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <a href="/" className="text-sm text-zinc-500 underline">← Home</a>

      <h1 className="mt-4 text-4xl font-bold tracking-tight">The euro</h1>
      <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
        From 1999 to today: how the single currency was built, broken, and held together.
        Below is the timeline of policy moves, the rate cycle, the balance sheet, and how
        peripheral spreads tell the real story.
      </p>

      {/* Timeline */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Timeline</h2>
        <p className="mt-1 text-xs text-zinc-500">{data.events.length} events. Click any event for details + related charts.</p>
        <div className="mt-4">
          <EventTimeline events={data.events} />
        </div>
      </section>

      {/* Rate cycle */}
      <Section title="ECB main refinancing rate" hint="Daily — with policy events overlaid">
        <TimeSeriesLine
          series={[{ label: 'Main refi rate', color: PALETTE.primary, data: data.ecbRate }]}
          format="pct1"
          events={rateMarkers.length > 12 ? [] : rateMarkers}
          height={320}
        />
      </Section>

      {/* Balance sheet + M2 */}
      <Section title="Balance sheet & money supply" hint="Eurosystem total assets (weekly) + M2 (monthly)">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Eurosystem balance sheet" subtitle="Total assets, EUR millions">
            <TimeSeriesLine series={[{ label: 'Balance sheet', color: PALETTE.primary, data: data.balanceSheet }]} format="int" height={260} />
          </Card>
          <Card title="M2 (eurozone)" subtitle="Intermediate money supply, EUR millions">
            <TimeSeriesLine series={[{ label: 'M2', color: PALETTE.primary, data: data.m2 }]} format="int" height={260} />
          </Card>
        </div>
      </Section>

      {/* FX */}
      <Section title="EUR / USD" hint="ECB reference exchange rate, daily">
        <TimeSeriesLine series={[{ label: 'EUR/USD', color: PALETTE.primary, data: data.eurUsd }]} format="plain" height={280} />
      </Section>

      {/* Inflation */}
      <Section title="Inflation story" hint="Eurozone HICP headline + core (monthly, % YoY)">
        <TimeSeriesLine
          series={[
            { label: 'HICP headline', color: PALETTE.warning, data: data.hicpHeadline },
            { label: 'HICP core',     color: PALETTE.primary, data: data.hicpCore, dashed: true },
          ]}
          format="pct1"
          events={hicpMarkers.length > 8 ? [] : hicpMarkers}
          height={320}
        />
      </Section>

      {/* Sovereign yield divergence */}
      <Section title="Sovereign yield divergence (PIIGS vs. Bund)" hint="10Y benchmark monthly — the chart that defined 2010-2012">
        <TimeSeriesLine series={yieldsSeries} format="pct1" height={380} />
        <p className="mt-3 text-xs text-zinc-500">
          The spread between Greek/Italian/Portuguese/Spanish/Irish 10Y yields and the German Bund is the cleanest
          measure of eurozone breakup risk. The narrowing after Draghi's July 2012 "whatever it takes" is the
          single most consequential central-bank communication on record.
        </p>
      </Section>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'The euro — debasement, inflation, rates',
        url: 'https://eurospending.org/euro',
      }) }} />
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
