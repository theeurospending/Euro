import type { Metadata } from 'next';
import { loadEuroPageData } from '@/lib/euro-page-data';
import { TimeSeriesLine } from '@/components/charts/time-series-line';
import { PALETTE, nthCountryColor } from '@/components/charts/palette';
import { EventTimeline } from '@/components/euro/event-timeline';
import { SiteHeader } from '@/components/layout/site-header';

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
    <>
    <SiteHeader />
    <main className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      <div className="kicker">The euro · 1999 → today</div>
      <h1 className="font-display mt-4 text-5xl tracking-tight text-white sm:text-6xl">The euro</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-300">
        How the single currency was built, broken, and held together.
        Below: the timeline of policy moves, the rate cycle, the balance sheet, and how
        peripheral spreads tell the real story.
      </p>

      {/* Timeline */}
      <section className="mt-12">
        <h2 className="font-display text-2xl text-white">Timeline</h2>
        <p className="mt-1 text-xs text-slate-400">{data.events.length} events. Click any event for details + related charts.</p>
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
        <p className="mt-4 max-w-3xl text-sm text-slate-400">
          The spread between peripheral 10Y yields and the German Bund is the cleanest measure of
          eurozone breakup risk. The narrowing after Draghi&apos;s July 2012 &quot;whatever it takes&quot; is the
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
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <div className="font-display text-sm tracking-wide text-white">{title}</div>
      {subtitle && <div className="mt-0.5 text-xs text-slate-400">{subtitle}</div>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
