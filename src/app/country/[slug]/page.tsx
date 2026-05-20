import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadCountryPageData, loadPeerPercentiles } from '@/lib/country-page-data';
import { getSeoOverride } from '@/lib/seo/overrides';
import { SiteHeader } from '@/components/layout/site-header';
import { TimeSeriesLine } from '@/components/charts/time-series-line';
import { TimeSeriesBar } from '@/components/charts/time-series-bar';
import { Donut } from '@/components/charts/donut';
import { Sparkline } from '@/components/charts/sparkline';
import { PALETTE } from '@/components/charts/palette';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [data, override] = await Promise.all([
    loadCountryPageData(slug),
    getSeoOverride(`/country/${slug}`),
  ]);
  if (!data) return { title: 'Country not found' };
  const c = data.country;
  const defaultTitle = `${c.name} — economic data and the euro`;
  const defaultDesc = `Economic trajectory of ${c.name}: spending, debt, deficit, inflation, unemployment and growth from 1999 to ${new Date().getFullYear()}.`;
  const title = override?.title || defaultTitle;
  const description = override?.description || defaultDesc;
  const ogImage = override?.og_image_url || `https://eurospending.org/og/country/${slug}`;
  return {
    title, description,
    openGraph: { title, description, type: 'website', images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter:   { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadCountryPageData(slug);
  if (!data) notFound();

  const peers = await loadPeerPercentiles(data.country.iso_code, [
    'gov_debt_pct_gdp',
    'gov_deficit_pct_gdp',
    'gdp_per_capita_eur',
  ]);

  const c = data.country;

  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      {/* Header */}
      <header className="mt-4 flex items-baseline gap-4">
        <span className="text-6xl">{c.flag_emoji}</span>
        <h1 className="font-display text-5xl tracking-tight text-white">{c.name}</h1>
      </header>
      <p className="kicker mt-3">
        {c.is_eu_member && c.joined_eu && <>EU member since {fmtYear(c.joined_eu)}{c.is_eurozone_member && c.joined_eurozone ? ` · eurozone since ${fmtYear(c.joined_eurozone)}` : ''}</>}
        {!c.is_eu_member && <>Non-EU comparator</>}
        {c.capital && <> · capital {c.capital}</>}
      </p>

      {/* Snapshot */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Snapshot label="GDP nominal"  metric="gdp_nominal_eur_millions"  unit="€M"   data={data} />
        <Snapshot label="GDP per cap"  metric="gdp_per_capita_eur"        unit="€"    data={data} />
        <Snapshot label="Deficit"      metric="gov_deficit_pct_gdp"       unit="% GDP" data={data} colorByDirection />
        <Snapshot label="Debt"         metric="gov_debt_pct_gdp"          unit="% GDP" data={data} colorByDirection invertDirection />
        <Snapshot label="HICP"         metric="hicp_annual_pct"           unit="%"     data={data} />
        <Snapshot label="Unemployment" metric="unemployment_rate_pct"     unit="%"     data={data} colorByDirection invertDirection />
      </section>

      {/* Narrative — intro */}
      {data.narrative.intro_html && (
        <section className="prose-on-navy mt-10 max-w-none text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: data.narrative.intro_html }} />
      )}

      {/* Fiscal trajectory */}
      <Section title="Fiscal trajectory" hint="Deficit history + debt vs eurozone average">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ChartCard title="Government deficit / surplus" subtitle="% of GDP, annual (B.9)">
            <TimeSeriesBar
              data={data.series['gov_deficit_pct_gdp']?.filter((p) => !p.is_forecast) ?? []}
              yLabel="% GDP"
              format="pct1"
              thresholds={[{ value: -3, label: 'Maastricht 3%', color: PALETTE.warning }]}
            />
          </ChartCard>

          <ChartCard title="Government debt" subtitle="% of GDP, vs eurozone average">
            <TimeSeriesLine
              series={[
                { label: c.name, data: data.series['gov_debt_pct_gdp']?.filter((p) => !p.is_forecast) ?? [], color: PALETTE.primary },
                { label: 'Eurozone average', data: data.ezAverage['gov_debt_pct_gdp'] ?? [], color: PALETTE.primaryDim, dashed: true },
              ]}
              yLabel="% GDP"
              format="pct0"
            />
          </ChartCard>
        </div>
      </Section>

      {/* Spending breakdown */}
      <Section title="Government spending — latest year" hint="By COFOG function (% of GDP)">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ChartCard title="Spending breakdown" subtitle={firstCofogYearLabel(data) ?? ''}>
            <Donut
              data={data.cofog.map((c) => ({ name: c.name, value: Number(c.value.toFixed(2)) }))}
              format="pct1"
            />
          </ChartCard>
          <ChartCard title="Total expenditure vs revenue" subtitle="% of GDP, annual">
            <TimeSeriesLine
              series={[
                { label: 'Expenditure', data: data.series['gov_expenditure_total_pct_gdp'] ?? [], color: PALETTE.negative },
                { label: 'Revenue',     data: data.series['gov_revenue_total_pct_gdp']     ?? [], color: PALETTE.positive },
              ]}
              yLabel="% GDP"
              format="pct0"
            />
          </ChartCard>
        </div>
      </Section>

      {/* Macro */}
      <Section title="Macro indicators">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <ChartCard title="Real GDP growth" subtitle="% YoY, annual">
            <TimeSeriesBar data={data.series['gdp_real_growth_pct']?.filter((p) => !p.is_forecast) ?? []} format="pct1" height={220} />
          </ChartCard>
          <ChartCard title="HICP inflation" subtitle="% YoY, annual average">
            <TimeSeriesLine series={[{ label: 'HICP', data: data.series['hicp_annual_pct'] ?? [], color: PALETTE.warning }]} format="pct1" height={220} />
          </ChartCard>
          <ChartCard title="Unemployment" subtitle="% of active population">
            <TimeSeriesLine series={[{ label: 'Unemployment', data: data.series['unemployment_rate_pct'] ?? [], color: PALETTE.negative }]} format="pct1" height={220} />
          </ChartCard>
        </div>
      </Section>

      {/* Sovereign yield */}
      {data.series['sovereign_10y_yield']?.length > 0 && (
        <Section title="Sovereign borrowing cost" hint="10Y benchmark government bond yield (monthly)">
          <ChartCard title="10Y yield">
            <TimeSeriesLine series={[{ label: c.name, data: data.series['sovereign_10y_yield'] ?? [], color: PALETTE.primary }]} format="pct1" />
          </ChartCard>
        </Section>
      )}

      {/* Peer ranks */}
      {Object.keys(peers).length > 0 && (
        <Section title="vs. EU peers" hint="Rank against the other 26 EU member states for the latest available period">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Object.entries(peers).map(([m, p]) => (
              <div key={m} className="surface p-4">
                <div className="kicker text-[10px]">{prettyMetric(m)}</div>
                <div className="font-display mt-2 text-4xl text-white">
                  {p.rank}<span className="text-base text-slate-500">/{p.total}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {prettyMetric(m, true)}: <span className="font-mono text-slate-200">{fmtPeerValue(m, p.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* IMF forecasts */}
      {data.series['imf_gdp_growth_forecast_pct']?.some((p) => p.is_forecast) && (
        <Section title="IMF WEO forecasts">
          <ChartCard title="GDP growth — historical + forecast" subtitle="Solid = actual · dashed = forecast">
            <TimeSeriesLine
              series={[
                { label: 'Historical', data: data.series['imf_gdp_growth_forecast_pct']?.filter((p) => !p.is_forecast) ?? [], color: PALETTE.primary },
                { label: 'Forecast',   data: data.series['imf_gdp_growth_forecast_pct']?.filter((p) => p.is_forecast)  ?? [], color: PALETTE.forecast, dashed: true },
              ]}
              format="pct1"
            />
          </ChartCard>
        </Section>
      )}

      {/* Narrative tail */}
      <div className="prose-on-navy mt-12 max-w-none space-y-6 text-base leading-relaxed">
        {data.narrative.fiscal_context_html && (
          <section dangerouslySetInnerHTML={{ __html: data.narrative.fiscal_context_html }} />
        )}
        {data.narrative.macro_context_html && (
          <section dangerouslySetInnerHTML={{ __html: data.narrative.macro_context_html }} />
        )}
        {data.narrative.current_situation_html && (
          <section dangerouslySetInnerHTML={{ __html: data.narrative.current_situation_html }} />
        )}
      </div>

      {/* Sources footer */}
      <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-slate-400">
        <div className="kicker">Data sources</div>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {data.sources.map((s) => (
            <li key={s.source} className="font-mono text-slate-300">
              {s.source}{s.latest_ingest && <span className="ml-1 text-slate-500">· refreshed {fmtRelative(s.latest_ingest)}</span>}
            </li>
          ))}
        </ul>
      </footer>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c)) }} />
    </main>
    </>
  );
}

// ============================================================================
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <div className="font-display text-sm tracking-wide text-white">{title}</div>
      {subtitle && <div className="mt-0.5 text-xs text-slate-400">{subtitle}</div>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Snapshot({
  label, metric, unit, data, colorByDirection, invertDirection,
}: {
  label: string;
  metric: string;
  unit: string;
  data: import('@/lib/country-page-data').CountryPageData;
  colorByDirection?: boolean;
  invertDirection?: boolean;
}) {
  const snap = data.snapshot[metric];
  if (!snap || !snap.latest) {
    return (
      <div className="surface p-3">
        <div className="kicker text-[10px]">{label}</div>
        <div className="mt-1 text-slate-500">—</div>
      </div>
    );
  }
  const v = snap.latest.value;
  const delta = snap.yoy_delta_abs;
  const goodDirection = delta == null ? null : (invertDirection ? delta < 0 : delta > 0);
  const deltaColor = colorByDirection && delta != null
    ? (goodDirection ? 'text-teal-300' : 'text-rose-300')
    : 'text-slate-400';

  return (
    <div className="surface p-3">
      <div className="kicker text-[10px]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-2xl text-white">{fmtSnapshot(v, metric)}</span>
        <span className="font-mono text-[10px] text-slate-400">{unit}</span>
      </div>
      <div className={`mt-0.5 text-xs font-mono ${deltaColor}`}>
        {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} YoY`}
      </div>
      <div className="mt-1"><Sparkline data={snap.spark} color="#C5CBF0" /></div>
      <div className="mt-1 font-mono text-[10px] text-slate-500">as of {snap.latest.period_start.slice(0, 7)}</div>
    </div>
  );
}

function fmtSnapshot(v: number, metric: string): string {
  if (metric === 'gdp_nominal_eur_millions') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}T`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}B`;
    return `${v.toFixed(0)}M`;
  }
  if (metric === 'gdp_per_capita_eur') return v.toLocaleString();
  return v.toFixed(2);
}

function fmtYear(d: string): string { return d.slice(0, 4); }
function fmtRelative(iso: string): string {
  const t = Date.parse(iso); if (isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60)      return 'just now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function firstCofogYearLabel(data: import('@/lib/country-page-data').CountryPageData): string | null {
  for (const c of data.cofog) {
    const m = data.series[c.metric_key];
    if (m && m.length > 0) return `latest year (${m.at(-1)!.period_start.slice(0, 4)})`;
  }
  return null;
}

function prettyMetric(key: string, longer = false): string {
  const map: Record<string, [string, string]> = {
    'gov_debt_pct_gdp':    ['Debt rank',    'debt'],
    'gov_deficit_pct_gdp': ['Deficit rank', 'deficit'],
    'gdp_per_capita_eur':  ['GDP per cap',  'GDP/cap'],
  };
  const m = map[key]; if (!m) return key;
  return longer ? m[1] : m[0];
}

function fmtPeerValue(metric: string, v: number): string {
  if (metric === 'gdp_per_capita_eur') return `€${v.toLocaleString()}`;
  return `${v.toFixed(1)}%`;
}

function jsonLd(c: { iso_code: string; name: string; flag_emoji: string | null; capital: string | null }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Country',
    name: c.name,
    identifier: c.iso_code,
    address: c.capital ? { '@type': 'PostalAddress', addressLocality: c.capital, addressCountry: c.iso_code } : undefined,
  };
}
