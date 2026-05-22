'use client';

import { useMemo, useState } from 'react';
import { geoMercator, geoPath, type GeoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import worldTopo from '../../../public/maps/world-110m.json';
import { NUMERIC_TO_ISO, EU_NUMERICS } from './iso-numeric';
import type { CountrySnapshot, HomepageMetric } from '@/lib/homepage-data';
import { HOMEPAGE_METRIC_LABELS } from '@/lib/homepage-data';
import { Sparkline } from '@/components/charts/sparkline';

type CountryFeature = Feature<Geometry, { name: string }> & { id: string | number };
type ColourMode = 'none' | HomepageMetric;

const VIEWBOX_W = 720;
const VIEWBOX_H = 540;

// Tighter scale than before — frames Europe end-to-end without trailing into
// the Atlantic and central Asia.
function getProjection() {
  return geoMercator()
    .center([15, 52])
    .scale(580)
    .translate([VIEWBOX_W / 2, VIEWBOX_H / 2 - 20]);
}

// Single brand-navy fill for default ('none') mode — clean Eurostat-style.
const DEFAULT_FILL = '#3E5996';

// Traffic-light quintile palette: dark green (best) → red (worst).
// Direction-aware via the metric's `betterDirection`.
const TRAFFIC = ['#15803d', '#84cc16', '#eab308', '#f97316', '#b91c1c'];

// Non-EU / non-eurozone fill.
const OUT_OF_SCOPE_FILL = '#cbd5e1';
const COUNTRY_BORDER = '#ffffff';

export function EuropeMap({ countries }: { countries: CountrySnapshot[] }) {
  // Default to debt — gives the map an immediate "story" instead of opening blank.
  const [mode, setMode] = useState<ColourMode>('gov_debt_pct_gdp');
  const [hover, setHover] = useState<{ iso: string; x: number; y: number; flipBelow: boolean } | null>(null);

  const features = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = feature(worldTopo as any, (worldTopo as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    return fc.features as CountryFeature[];
  }, []);

  const path: GeoPath = useMemo(() => geoPath(getProjection()), []);
  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso_code, c])), [countries]);

  // Build the blue colour scale for the active metric.
  const metricScale = useMemo(() => {
    if (mode === 'none') return null;
    const meta = HOMEPAGE_METRIC_LABELS[mode];
    const values: number[] = [];
    for (const c of countries) {
      if (!c.is_eu_member) continue;
      const v = c.metrics[mode]?.value;
      if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
    }
    return blueScale(values, meta.betterDirection);
  }, [mode, countries]);

  const hoverCountry = hover ? byIso.get(hover.iso) : null;

  // Compute the EU-wide latest-period summary for the headline.
  const headlineSummary = useMemo(() => {
    if (mode === 'none') return null;
    const eu = countries.filter((c) => c.is_eu_member && !c.is_aggregate);
    const cells = eu
      .map((c) => c.metrics[mode])
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    if (cells.length === 0) return null;
    const total = cells.reduce((s, c) => s + c.value, 0);
    const mean = total / cells.length;
    const periodLabels = [...new Set(cells.map((c) => c.period_start.slice(0, 7)))].sort();
    const latestPeriod = periodLabels[periodLabels.length - 1];
    return { mean, count: cells.length, period: latestPeriod };
  }, [mode, countries]);

  const activeLabel = mode === 'none' ? null : HOMEPAGE_METRIC_LABELS[mode];

  return (
    <div className="relative">
      {/* Headline summary */}
      {activeLabel && headlineSummary && mode !== 'none' && (
        <div className="mb-5">
          <h3 className="font-display text-2xl tracking-tight text-white sm:text-3xl">
            The average {activeLabel.label.toLowerCase()} across the EU 27 in {fmtPeriod(headlineSummary.period)} was{' '}
            <span className="text-[var(--brand-gold)]">{fmtSummary(mode, headlineSummary.mean)}</span>
          </h3>
        </div>
      )}

      {/* Metric toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-xs uppercase tracking-widest text-slate-400">View</span>
        <Chip active={mode === 'none'} onClick={() => setMode('none')}>Default</Chip>
        {(Object.keys(HOMEPAGE_METRIC_LABELS) as HomepageMetric[]).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
            {HOMEPAGE_METRIC_LABELS[m].label}
          </Chip>
        ))}
      </div>

      {/* SVG map */}
      <div className="relative overflow-hidden rounded-lg bg-white" style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="h-full w-full"
          onMouseLeave={() => setHover(null)}
        >
          {/* Sea / canvas */}
          <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="#ffffff" />
          {features.map((f) => {
            const numericId = typeof f.id === 'string' ? parseInt(f.id, 10) : (f.id as number);
            const iso = NUMERIC_TO_ISO[numericId];
            const isEU = EU_NUMERICS.has(numericId);
            const c = iso ? byIso.get(iso) : undefined;
            const d = path(f);
            if (!d) return null;

            let fill: string;
            if (mode === 'none') {
              if (isEU) fill = DEFAULT_FILL;
              else fill = OUT_OF_SCOPE_FILL;
            } else {
              const value = c?.metrics[mode]?.value;
              if (isEU && typeof value === 'number' && metricScale) fill = metricScale(value);
              else if (isEU) fill = '#e2e8f0';
              else fill = OUT_OF_SCOPE_FILL;
            }

            const interactive = isEU && Boolean(iso);
            return (
              <a key={String(f.id)} href={c?.slug ? `/country/${c.slug}` : undefined}>
                <path
                  d={d}
                  fill={fill}
                  stroke={COUNTRY_BORDER}
                  strokeWidth={1.0}
                  className={interactive ? 'cursor-pointer transition-opacity hover:opacity-80' : 'pointer-events-none'}
                  onMouseEnter={(e) => {
                    if (!interactive || !iso) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    // Card is ~220px tall. If the country path's top edge is within
                    // 240px of the viewport top, flip the card below the path.
                    const flipBelow = rect.top < 240;
                    setHover({
                      iso,
                      x: rect.left + rect.width / 2,
                      y: flipBelow ? rect.bottom : rect.top,
                      flipBelow,
                    });
                  }}
                />
              </a>
            );
          })}
        </svg>

        {/* Hover card — flips below the country when there's no room above. */}
        {hoverCountry && hover && (
          <div
            className={`pointer-events-none fixed z-10 -translate-x-1/2 rounded-lg border border-white/15 bg-[var(--brand-navy-deep)] p-3 shadow-2xl ${
              hover.flipBelow ? '' : '-translate-y-full'
            }`}
            style={{ left: hover.x, top: hover.flipBelow ? hover.y + 8 : hover.y - 8, maxWidth: 240 }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{hoverCountry.flag_emoji}</span>
              <span className="font-display text-white">{hoverCountry.name}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {(Object.keys(HOMEPAGE_METRIC_LABELS) as HomepageMetric[]).map((m) => {
                const v = hoverCountry.metrics[m];
                if (!v) return null;
                return (
                  <div key={m} className="flex flex-col">
                    <span className="text-slate-400">{HOMEPAGE_METRIC_LABELS[m].label}</span>
                    <span className="font-mono text-slate-200">{fmtValue(m, v.value)}</span>
                  </div>
                );
              })}
            </div>
            {mode !== 'none' && hoverCountry.metrics[mode]?.spark && (
              <div className="mt-2">
                <Sparkline data={hoverCountry.metrics[mode]!.spark} width={200} height={24} color="#C5CBF0" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Colour scale legend (only when a metric is active) */}
      {mode !== 'none' && metricScale && (
        <Legend
          metric={mode}
          values={countries.filter((c) => c.is_eu_member).map((c) => c.metrics[mode]?.value).filter((v): v is number => typeof v === 'number')}
          betterDirection={HOMEPAGE_METRIC_LABELS[mode].betterDirection}
        />
      )}
    </div>
  );
}

// ============================================================================
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-[var(--brand-gold)] text-[var(--brand-navy)] shadow-lg shadow-[var(--brand-gold)]/20'
          : 'border border-white/25 text-white hover:bg-white/10 hover:border-white/40'
      }`}
    >
      {children}
    </button>
  );
}

function fmtValue(m: HomepageMetric, v: number): string {
  if (m === 'gdp_per_capita_eur') return `€${Math.round(v).toLocaleString()}`;
  return `${v.toFixed(1)}%`;
}

function fmtSummary(m: HomepageMetric, v: number): string {
  if (m === 'gdp_per_capita_eur') return `€${Math.round(v).toLocaleString()}`;
  return `${v.toFixed(1)}%`;
}

function fmtPeriod(p: string): string {
  // Accept 'YYYY-MM' or 'YYYY-MM-DD' input; return a friendly label.
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, mo] = p.split('-');
    const monthName = new Date(Date.UTC(Number(y), Number(mo) - 1, 1)).toLocaleString('en-GB', { month: 'long' });
    return `${monthName} ${y}`;
  }
  return p;
}

// Traffic-light quintile scale.
// betterDirection='low'  → low values get GREEN (best), high get RED (worst). e.g. debt, inflation
// betterDirection='high' → high values get GREEN (best), low get RED (worst). e.g. GDP growth
function blueScale(values: number[], betterDirection: 'low' | 'high'): (v: number) => string {
  if (values.length === 0) return () => TRAFFIC[2];
  const sorted = [...values].sort((a, b) => a - b);
  const q20 = quantile(sorted, 0.2);
  const q40 = quantile(sorted, 0.4);
  const q60 = quantile(sorted, 0.6);
  const q80 = quantile(sorted, 0.8);
  const palette = betterDirection === 'low' ? TRAFFIC : [...TRAFFIC].reverse();
  return (v: number) => {
    if (v <= q20) return palette[0];
    if (v <= q40) return palette[1];
    if (v <= q60) return palette[2];
    if (v <= q80) return palette[3];
    return palette[4];
  };
}

function quantile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function Legend({ metric, values, betterDirection }: { metric: HomepageMetric; values: number[]; betterDirection: 'low' | 'high' }) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  const palette = betterDirection === 'low' ? TRAFFIC : [...TRAFFIC].reverse();
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
      <span className="font-mono">{fmtValue(metric, lo)}</span>
      <div className="flex flex-1 overflow-hidden rounded">
        {palette.map((c, i) => (
          <div key={i} style={{ background: c }} className="h-2 flex-1" />
        ))}
      </div>
      <span className="font-mono">{fmtValue(metric, hi)}</span>
    </div>
  );
}
