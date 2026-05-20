// 1080×1080 PNG generator using next/og (Satori).
//
// Satori is flexbox-only — no CSS grid, no transforms beyond translate/scale.
// We draw a "stat card": big number + small bar chart using nested flex boxes
// with explicit pixel heights/widths.

import { ImageResponse } from 'next/og';
import type { CandidateFact, DataPoint } from '@/lib/social/types';

const WIDTH = 1080;
const HEIGHT = 1080;

// Eurospending brand
const BG = '#fafafa';
const FG = '#0f172a';
const MUTED = '#71717a';
const ACCENT = '#0f766e';
const NEGATIVE = '#dc2626';
const POSITIVE = '#16a34a';

export type ChartCardInput = {
  fact: CandidateFact;
  series: DataPoint[];                  // up to ~20 points; will be downsampled if larger
  unit: string;                         // e.g. '% of GDP'
  country_label: string;                // 'Italy 🇮🇹' or 'Eurozone 🇪🇺'
};

export async function renderChartCardPng(input: ChartCardInput): Promise<ArrayBuffer> {
  const { fact, series, unit, country_label } = input;
  const valueStr = formatValue(fact.supporting_data.value, unit);
  const periodStr = formatPeriod(fact.supporting_data.period);
  const downsampled = downsample(series, 24);
  const max = Math.max(...downsampled.map((p) => Math.abs(p.value)), 1);

  const response = new ImageResponse(
    (
      <div style={{
        width: WIDTH, height: HEIGHT, background: BG, display: 'flex', flexDirection: 'column',
        padding: 80, color: FG, fontFamily: 'sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{country_label}</div>
          <div style={{ fontSize: 18, color: MUTED }}>eurospending.org</div>
        </div>

        {/* Headline */}
        <div style={{
          marginTop: 40, fontSize: 36, fontWeight: 500, lineHeight: 1.2, color: FG,
          display: 'flex',
        }}>
          {fact.headline}
        </div>

        {/* Big value */}
        <div style={{
          marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 200, fontWeight: 800, lineHeight: 1, color: ACCENT }}>{valueStr}</div>
          <div style={{ marginTop: 12, fontSize: 24, color: MUTED }}>{unit} · {periodStr}</div>
        </div>

        {/* Bar chart */}
        {downsampled.length > 0 && (
          <div style={{
            marginTop: 40, display: 'flex', alignItems: 'flex-end', height: 200, gap: 6,
            borderBottom: `2px solid ${MUTED}`, paddingBottom: 0,
          }}>
            {downsampled.map((p, i) => {
              const h = Math.max(2, Math.round((Math.abs(p.value) / max) * 180));
              const color = p.value >= 0 ? POSITIVE : NEGATIVE;
              return (
                <div key={i} style={{
                  width: Math.floor((WIDTH - 160 - downsampled.length * 6) / downsampled.length),
                  height: h, background: color, display: 'flex',
                }} />
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 18, color: MUTED }}>
          <div>{`${fact.rule_name} · priority ${fact.priority_score}`}</div>
          <div>Source: Eurostat / ECB / IMF</div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    },
  );

  return await response.arrayBuffer();
}

function downsample(arr: DataPoint[], n: number): DataPoint[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: DataPoint[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
  return out;
}

function formatValue(raw: unknown, unit: string): string {
  if (typeof raw !== 'number') return String(raw ?? '');
  if (unit.includes('%')) return `${raw.toFixed(1)}%`;
  if (unit.toLowerCase().includes('eur')) {
    if (raw >= 1_000_000) return `€${(raw / 1_000_000).toFixed(1)}T`;
    if (raw >= 1_000) return `€${(raw / 1_000).toFixed(0)}B`;
    return `€${raw.toFixed(0)}M`;
  }
  return raw.toFixed(2);
}

function formatPeriod(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  return raw;
}
