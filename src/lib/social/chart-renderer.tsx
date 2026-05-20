// 1080×1080 PNG generator using next/og (Satori).
//
// Satori is strict: every <div> with more than one child MUST set display:flex,
// display:contents, or display:none. We default every container to display:flex.

import { ImageResponse } from 'next/og';
import type { CandidateFact, DataPoint } from '@/lib/social/types';

const WIDTH = 1080;
const HEIGHT = 1080;

const BG = '#fafafa';
const FG = '#0f172a';
const MUTED = '#71717a';
const ACCENT = '#0f766e';
const NEGATIVE = '#dc2626';
const POSITIVE = '#16a34a';

export type ChartCardInput = {
  fact: CandidateFact;
  series: DataPoint[];
  unit: string;
  country_label: string;
};

export async function renderChartCardPng(input: ChartCardInput): Promise<ArrayBuffer> {
  const { fact, series, unit, country_label } = input;
  const valueStr = formatValue(fact.supporting_data.value, unit);
  const periodStr = formatPeriod(fact.supporting_data.period);
  const downsampled = downsample(series, 24);
  const max = Math.max(...downsampled.map((p) => Math.abs(p.value)), 1);
  const barW = Math.floor((WIDTH - 160 - downsampled.length * 6) / Math.max(downsampled.length, 1));

  const response = new ImageResponse(
    (
      <div style={{
        width: WIDTH, height: HEIGHT, background: BG, display: 'flex', flexDirection: 'column',
        padding: 80, color: FG, fontFamily: 'sans-serif',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>{country_label}</div>
          <div style={{ display: 'flex', fontSize: 18, color: MUTED }}>eurospending.org</div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', marginTop: 40, fontSize: 36, fontWeight: 500, lineHeight: 1.2, color: FG, maxWidth: WIDTH - 160 }}>
          {fact.headline}
        </div>

        {/* Big value */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 40 }}>
          <div style={{ display: 'flex', fontSize: 200, fontWeight: 800, lineHeight: 1, color: ACCENT }}>{valueStr}</div>
          <div style={{ display: 'flex', marginTop: 12, fontSize: 24, color: MUTED }}>{unit} · {periodStr}</div>
        </div>

        {/* Bar chart */}
        {downsampled.length > 0 ? (
          <div style={{
            display: 'flex', alignItems: 'flex-end', height: 200, gap: 6,
            marginTop: 40, borderBottom: `2px solid ${MUTED}`,
          }}>
            {downsampled.map((p, i) => (
              <div key={i} style={{
                display: 'flex',
                width: barW,
                height: Math.max(2, Math.round((Math.abs(p.value) / max) * 180)),
                background: p.value >= 0 ? POSITIVE : NEGATIVE,
              }} />
            ))}
          </div>
        ) : <div style={{ display: 'flex' }} />}

        {/* Footer */}
        <div style={{
          display: 'flex', marginTop: 'auto', justifyContent: 'space-between',
          width: '100%', fontSize: 18, color: MUTED,
        }}>
          <div style={{ display: 'flex' }}>{`${fact.rule_name} · priority ${fact.priority_score}`}</div>
          <div style={{ display: 'flex' }}>Source: Eurostat / ECB / IMF</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
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
