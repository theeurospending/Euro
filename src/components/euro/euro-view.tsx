'use client';

import { useState } from 'react';
import type { EuroPageData } from '@/lib/euro-page-data';
import { TimeSeriesLine } from '@/components/charts/time-series-line';
import { PALETTE, nthCountryColor } from '@/components/charts/palette';
import { EventTimeline } from '@/components/euro/event-timeline';

type TabId = 'overview' | 'debasement' | 'regions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'The euro' },
  { id: 'debasement', label: 'Debasement' },
  { id: 'regions', label: 'Regions' },
];

export function EuroView({ data }: { data: EuroPageData }) {
  const [tab, setTab] = useState<TabId>('overview');

  const rateMarkers = data.events
    .filter((e) => e.category === 'rate_change' || e.category === 'qe')
    .map((e) => ({ date: e.event_date, label: clip(e.title), color: PALETTE.warning }));
  const hicpMarkers = data.events
    .filter((e) => e.category === 'crisis' || e.category === 'rate_change')
    .map((e) => ({ date: e.event_date, label: clip(e.title), color: PALETTE.negative }));
  const yieldsSeries = data.sovereignYields.map((s, i) => ({
    label: s.country_name,
    color: s.country_iso === 'DE' ? PALETTE.primary : nthCountryColor(i + 1),
    data: s.data,
  }));

  return (
    <div className="mt-10">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-[var(--brand-lav)] font-semibold text-[var(--brand-navy)]'
                : 'border border-[var(--brand-navy)]/30 bg-[var(--brand-navy)]/[0.04] text-[var(--brand-navy)] hover:bg-[var(--brand-navy)]/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Section title="Timeline" hint={`${data.events.length} events. Click any event for details + related charts.`}>
            <div className="surface p-4 lg:p-6"><EventTimeline events={data.events} /></div>
          </Section>
          <Section title="ECB main refinancing rate" hint="Daily — with policy events overlaid">
            <Card>
              <TimeSeriesLine series={[{ label: 'Main refi rate', color: PALETTE.primary, data: data.ecbRate }]}
                format="pct1" events={rateMarkers.length > 12 ? [] : rateMarkers} height={360} />
            </Card>
          </Section>
          <Section title="Balance sheet & money supply" hint="Eurosystem total assets (weekly) + M2 (monthly)">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Eurosystem balance sheet" subtitle="Total assets, EUR millions">
                <TimeSeriesLine series={[{ label: 'Balance sheet', color: PALETTE.primary, data: data.balanceSheet }]} format="int" height={300} />
              </Card>
              <Card title="M2 (eurozone)" subtitle="Intermediate money supply, EUR millions">
                <TimeSeriesLine series={[{ label: 'M2', color: PALETTE.primary, data: data.m2 }]} format="int" height={300} />
              </Card>
            </div>
          </Section>
          <Section title="EUR / USD" hint="ECB reference exchange rate, daily">
            <Card><TimeSeriesLine series={[{ label: 'EUR/USD', color: PALETTE.primary, data: data.eurUsd }]} format="plain" height={320} /></Card>
          </Section>
          <Section title="Inflation story" hint="Eurozone HICP headline + core (monthly, % YoY)">
            <Card>
              <TimeSeriesLine
                series={[
                  { label: 'HICP headline', color: PALETTE.warning, data: data.hicpHeadline },
                  { label: 'HICP core', color: PALETTE.primary, data: data.hicpCore, dashed: true },
                ]}
                format="pct1" events={hicpMarkers.length > 8 ? [] : hicpMarkers} height={360} />
            </Card>
          </Section>
          <Section title="Sovereign yield divergence (PIIGS vs. Bund)" hint="10Y benchmark monthly — the chart that defined 2010-2012">
            <Card><TimeSeriesLine series={yieldsSeries} format="pct1" height={400} /></Card>
            <p className="mt-4 max-w-3xl text-sm text-[var(--brand-navy)]/65">
              The spread between peripheral 10Y yields and the German Bund is the cleanest measure of
              eurozone breakup risk. The narrowing after Draghi&apos;s July 2012 &quot;whatever it takes&quot; is the
              single most consequential central-bank communication on record.
            </p>
          </Section>
        </>
      )}

      {tab === 'debasement' && (
        <>
          <p className="mt-8 max-w-2xl text-sm text-[var(--brand-navy)]/70">
            The euro&apos;s internal value is not fixed. As the money supply grows and prices compound,
            a euro buys steadily less — in goods, in gold, and against scarce assets. The charts below
            show it directly. See the explainer{' '}
            <a href="/blog/currency-debasement-explained" className="underline">Currency debasement, explained</a>.
          </p>
          <Section title="The price of gold in euro" hint="Stooq daily close, EUR per troy ounce — a rising line means the euro buys less gold">
            <Card>
              {data.goldEur.length > 0
                ? <TimeSeriesLine series={[{ label: 'Gold (EUR/oz)', color: PALETTE.warning, data: data.goldEur }]} format="int" height={340} />
                : <EmptyHint source="prices:stooq" />}
            </Card>
          </Section>
          <Section title="The price of Bitcoin in euro" hint="Stooq daily close, EUR — the hardest-money benchmark">
            <Card>
              {data.btcEur.length > 0
                ? <TimeSeriesLine series={[{ label: 'Bitcoin (EUR)', color: PALETTE.primary, data: data.btcEur }]} format="int" height={340} />
                : <EmptyHint source="prices:stooq" />}
            </Card>
          </Section>
          <Section
            title="Broad money (M3) per person"
            hint={data.ezPopulation ? `M3 ÷ eurozone population (~${(data.ezPopulation / 1_000_000).toFixed(0)}m), EUR per person` : 'M3 per person, EUR'}
          >
            <Card>
              {data.m3PerPerson.length > 0
                ? <TimeSeriesLine series={[{ label: 'M3 per person', color: PALETTE.primary, data: data.m3PerPerson }]} format="int" height={340} />
                : <EmptyHint source="ecb:bsi_money_supply / eurostat:demo_pjan" />}
            </Card>
          </Section>
          <Section
            title="Accumulated inflation"
            hint={data.inflationBaseYear ? `Cumulative eurozone price level, ${data.inflationBaseYear} = 100` : 'Cumulative eurozone price level'}
          >
            <Card>
              {data.cumulativeInflation.length > 1
                ? <TimeSeriesLine series={[{ label: 'Price level (index)', color: PALETTE.negative, data: data.cumulativeInflation }]} format="int" height={340} />
                : <EmptyHint source="ecb:icp_hicp" />}
            </Card>
            {data.cumulativeInflation.length > 1 && (
              <p className="mt-4 max-w-3xl text-sm text-[var(--brand-navy)]/65">
                Each year&apos;s inflation compounds on the last. An index of {data.cumulativeInflation.at(-1)!.value.toFixed(0)} means
                prices are {(data.cumulativeInflation.at(-1)!.value - 100).toFixed(0)}% higher than in {data.inflationBaseYear},
                so €1 then buys about €{(100 / data.cumulativeInflation.at(-1)!.value).toFixed(2)} of goods today.
              </p>
            )}
          </Section>
        </>
      )}

      {tab === 'regions' && (
        <>
          <p className="mt-8 max-w-2xl text-sm text-[var(--brand-navy)]/70">
            How the eurozone compares with the world&apos;s other major economies, on a consistent IMF basis.
            Recent years are IMF projections. See{' '}
            <a href="/blog/eu-vs-us-china-growth-gap" className="underline">the growth-gap explainer</a>.
          </p>
          {data.regions.every((r) => r.series.length === 0) ? (
            <Section title="Eurozone vs US, China, India, Japan"><Card><EmptyHint source="imf:weo_forecasts" /></Card></Section>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {data.regions.map((r) => (
                <Card key={r.metric_key} title={r.label} subtitle={r.unit}>
                  {r.series.length > 0
                    ? <TimeSeriesLine
                        series={r.series.map((s) => ({
                          label: s.label,
                          color: s.region === 'EZ' ? PALETTE.primary : nthCountryColor(REGION_COLOR_INDEX[s.region] ?? 1),
                          data: s.data,
                        }))}
                        format={r.format} height={300} />
                    : <EmptyHint source="imf:weo_forecasts" />}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const REGION_COLOR_INDEX: Record<string, number> = { US: 1, CN: 2, IN: 3, JP: 4 };

function clip(s: string): string {
  return s.length > 22 ? `${s.slice(0, 22)}…` : s;
}

function EmptyHint({ source }: { source: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded border border-dashed border-white/15 text-center text-sm text-slate-400">
      No data yet — run an ingest for <span className="mx-1 font-mono">{source}</span>.
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl">{title}</h2>
      {hint && <p className="mt-1 text-sm text-[var(--brand-navy)]/60">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4 lg:p-6">
      {title && <div className="font-display text-sm tracking-wide text-white">{title}</div>}
      {subtitle && <div className="mt-0.5 text-xs text-slate-400">{subtitle}</div>}
      <div className={title ? 'mt-3' : ''}>{children}</div>
    </div>
  );
}
