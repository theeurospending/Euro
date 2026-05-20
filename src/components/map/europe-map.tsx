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

// Project once at module scope to keep render cheap.
// fitExtent target ~ map viewport. We frame on Europe.
const VIEWBOX_W = 720;
const VIEWBOX_H = 540;

function getProjection() {
  // Mercator centered on continental Europe.
  return geoMercator()
    .center([15, 54])     // lon, lat — center of EU
    .scale(720)
    .translate([VIEWBOX_W / 2, VIEWBOX_H / 2]);
}

export function EuropeMap({ countries, defaultMetric = 'gov_debt_pct_gdp' }: {
  countries: CountrySnapshot[];
  defaultMetric?: HomepageMetric;
}) {
  const [metric, setMetric] = useState<HomepageMetric>(defaultMetric);
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);

  // Convert TopoJSON to GeoJSON once.
  const features = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = feature(worldTopo as any, (worldTopo as any).objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    return fc.features as CountryFeature[];
  }, []);

  const path: GeoPath = useMemo(() => geoPath(getProjection()), []);

  const byIso = useMemo(() => new Map(countries.map((c) => [c.iso_code, c])), [countries]);

  // Build value array for the selected metric to derive a colour scale.
  const values: number[] = [];
  for (const c of countries) {
    if (!c.is_eu_member) continue;
    const v = c.metrics[metric]?.value;
    if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
  }
  const scale = colorScale(values, HOMEPAGE_METRIC_LABELS[metric].betterDirection);

  const hoverCountry = hover ? byIso.get(hover.iso) : null;

  return (
    <div className="relative">
      {/* Metric toolbar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(HOMEPAGE_METRIC_LABELS) as HomepageMetric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              m === metric
                ? 'bg-[var(--brand-lav)] text-[var(--brand-navy)] font-medium'
                : 'border border-white/15 text-slate-300 hover:bg-white/5'
            }`}
          >
            {HOMEPAGE_METRIC_LABELS[m].label}
          </button>
        ))}
      </div>

      {/* SVG map */}
      <div className="relative" style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}` }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full h-full"
          onMouseLeave={() => setHover(null)}
        >
          {features.map((f) => {
            const numericId = typeof f.id === 'string' ? parseInt(f.id, 10) : (f.id as number);
            const iso = NUMERIC_TO_ISO[numericId];
            const isEU = EU_NUMERICS.has(numericId);
            const c = iso ? byIso.get(iso) : undefined;
            const value = c?.metrics[metric]?.value;
            const fill = isEU
              ? (typeof value === 'number' ? scale(value) : 'rgba(197,203,240,0.18)')
              : 'rgba(197,203,240,0.06)';
            const d = path(f);
            if (!d) return null;
            return (
              <a key={String(f.id)} href={c?.slug ? `/country/${c.slug}` : undefined}>
                <path
                  d={d}
                  fill={fill}
                  stroke="#15203C"
                  strokeWidth={0.6}
                  className={isEU ? 'cursor-pointer transition-opacity hover:opacity-80' : 'pointer-events-none'}
                  onMouseEnter={(e) => {
                    if (!isEU || !iso) return;
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
            {hoverCountry.metrics[metric]?.spark && (
              <div className="mt-2">
                <Sparkline data={hoverCountry.metrics[metric]!.spark} width={200} height={24} color="#C5CBF0" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Colour scale legend */}
      {values.length > 0 && <Legend metric={metric} values={values} betterDirection={HOMEPAGE_METRIC_LABELS[metric].betterDirection} />}
    </div>
  );
}

// ============================================================================
function fmtValue(m: HomepageMetric, v: number): string {
  if (m === 'gdp_per_capita_eur') return `€${Math.round(v).toLocaleString()}`;
  return `${v.toFixed(1)}%`;
}

// Diverging colour scale based on quintiles.
// betterDirection: 'low' = green for low values, red for high (e.g. debt)
//                  'high' = green for high values, red for low (e.g. GDP growth)
function colorScale(values: number[], betterDirection: 'low' | 'high'): (v: number) => string {
  if (values.length === 0) return () => '#e4e4e7';
  const sorted = [...values].sort((a, b) => a - b);
  const q20 = quantile(sorted, 0.2);
  const q40 = quantile(sorted, 0.4);
  const q60 = quantile(sorted, 0.6);
  const q80 = quantile(sorted, 0.8);

  // Palette: 5 shades, green → red OR red → green depending on direction.
  const greenToRed = ['#16a34a', '#84cc16', '#facc15', '#f97316', '#dc2626'];
  const palette = betterDirection === 'low' ? greenToRed : [...greenToRed].reverse();

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
  const sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  const palette = ['#16a34a', '#84cc16', '#facc15', '#f97316', '#dc2626'];
  const ordered = betterDirection === 'low' ? palette : [...palette].reverse();
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
      <span>{fmtValue(metric, lo)}</span>
      <div className="flex flex-1 overflow-hidden rounded">
        {ordered.map((c, i) => (
          <div key={i} style={{ background: c }} className="h-2 flex-1" />
        ))}
      </div>
      <span>{fmtValue(metric, hi)}</span>
    </div>
  );
}
