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

// Subtle navy shade palette — used as the default fill when no metric is
// active. Each country gets one shade deterministically from its numeric id.
const NAVY_SHADES = [
  '#1B2A4A', '#22335A', '#1A2647', '#27396B', '#1E2D55',
  '#15223F', '#283D75', '#1D2E54',
];

// Sequential blue scale used when a metric is active — runs from a deep
// navy to bright lavender, on-brand and readable on the dark background.
const METRIC_BLUES = ['#1F2A52', '#2B3E7A', '#465A9F', '#7A87C4', '#C5CBF0'];

export function EuropeMap({ countries }: { countries: CountrySnapshot[] }) {
  const [mode, setMode] = useState<ColourMode>('none');
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);

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

  return (
    <div className="relative">
      {/* Metric toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">View</span>
        <Chip active={mode === 'none'} onClick={() => setMode('none')}>Default</Chip>
        {(Object.keys(HOMEPAGE_METRIC_LABELS) as HomepageMetric[]).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
            {HOMEPAGE_METRIC_LABELS[m].label}
          </Chip>
        ))}
      </div>

      {/* SVG map */}
      <div className="relative" style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="h-full w-full"
          onMouseLeave={() => setHover(null)}
        >
          {features.map((f) => {
            const numericId = typeof f.id === 'string' ? parseInt(f.id, 10) : (f.id as number);
            const iso = NUMERIC_TO_ISO[numericId];
            const isEU = EU_NUMERICS.has(numericId);
            const c = iso ? byIso.get(iso) : undefined;
            const d = path(f);
            if (!d) return null;

            let fill: string;
            if (mode === 'none') {
              if (isEU) fill = NAVY_SHADES[numericId % NAVY_SHADES.length];
              else fill = '#172241';                  // non-EU: slightly darker than navy bg
            } else {
              const value = c?.metrics[mode]?.value;
              if (isEU && typeof value === 'number' && metricScale) fill = metricScale(value);
              else if (isEU) fill = 'rgba(197,203,240,0.10)';
              else fill = '#172241';
            }

            const interactive = isEU && Boolean(iso);
            return (
              <a key={String(f.id)} href={c?.slug ? `/country/${c.slug}` : undefined}>
                <path
                  d={d}
                  fill={fill}
                  stroke="rgba(197,203,240,0.35)"
                  strokeWidth={0.6}
                  className={interactive ? 'cursor-pointer transition-opacity hover:opacity-80' : 'pointer-events-none'}
                  onMouseEnter={(e) => {
                    if (!interactive || !iso) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHover({ iso, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                />
              </a>
            );
          })}
        </svg>

        {/* Hover card */}
        {hoverCountry && hover && (
          <div
            className="pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-[var(--brand-navy-deep)] p-3 shadow-2xl"
            style={{ left: hover.x, top: hover.y - 8, maxWidth: 240 }}
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
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? 'bg-[var(--brand-lav)] text-[var(--brand-navy)] font-medium'
          : 'border border-white/15 text-slate-300 hover:bg-white/5'
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

// Sequential blue scale based on quintiles.
function blueScale(values: number[], betterDirection: 'low' | 'high'): (v: number) => string {
  if (values.length === 0) return () => '#1B2A4A';
  const sorted = [...values].sort((a, b) => a - b);
  const q20 = quantile(sorted, 0.2);
  const q40 = quantile(sorted, 0.4);
  const q60 = quantile(sorted, 0.6);
  const q80 = quantile(sorted, 0.8);
  // For "better=low" metrics (debt, inflation), low values get LIGHT lavender (good = bright),
  // high values get DARK navy. For "better=high", reverse.
  const palette = betterDirection === 'low' ? [...METRIC_BLUES].reverse() : METRIC_BLUES;
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
  const palette = betterDirection === 'low' ? [...METRIC_BLUES].reverse() : METRIC_BLUES;
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
