// On-brand 1080×1080 infographic templates (EU blue + gold) rendered with
// next/og (Satori). One module holds the shared theme, all templates, and the
// selector so the runner and admin routes pick from the same set.
//
// Satori is strict: every <div> with more than one child MUST set display
// (flex/contents/none). We default every container to display:flex.

import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';
import type { CandidateFact, DataPoint } from '@/lib/social/types';
import { loadArchivoNarrow } from '@/lib/og-fonts';

export type TemplateId = 'stat_spotlight' | 'trend_line' | 'bar_trend' | 'comparison';

export type InfographicInput = {
  fact: CandidateFact;
  series: DataPoint[];
  unit: string;
  country_label: string;
};

const SIZE = 1080;
const BLUE = '#1B4DB5';        // EU royal blue (matches the example posts)
const BLUE_DARK = '#10245C';
const GOLD = '#FFCC00';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const POSITIVE = '#34D399';
const NEGATIVE = '#F87171';

// ---------------------------------------------------------------------------
// Selector — deterministic per fact, but rotates across the eligible set so a
// batch of drafts doesn't render identically.
// ---------------------------------------------------------------------------

export function selectInfographicTemplate(fact: CandidateFact, series: DataPoint[]): TemplateId {
  const sd = fact.supporting_data;
  const hasPrior = typeof sd.prior_value === 'number' || typeof sd.prior_extreme_value === 'number';
  const hasSeries = series.length >= 4;

  // No series and no chart → a number is all we have.
  if (fact.chart_type === 'none' || (!hasSeries && !hasPrior)) return 'stat_spotlight';

  const eligible: TemplateId[] = ['stat_spotlight'];
  if (hasSeries) eligible.push('trend_line', 'bar_trend');
  if (hasPrior) eligible.push('comparison');

  return eligible[seedFrom(fact) % eligible.length];
}

export function seedFrom(fact: CandidateFact): number {
  const sd = fact.supporting_data;
  const s = `${fact.rule_name}|${fact.country_iso ?? ''}|${sd.metric ?? ''}|${sd.period ?? ''}|${sd.value ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Renderer entrypoint
// ---------------------------------------------------------------------------

export async function renderInfographicPng(templateId: TemplateId, input: InfographicInput): Promise<ArrayBuffer> {
  const fontData = await loadArchivoNarrow();
  const fonts = fontData ? [{ name: 'Archivo Narrow', data: fontData, weight: 700 as const, style: 'normal' as const }] : undefined;
  const display = fontData ? 'Archivo Narrow' : 'sans-serif';

  const tree = buildTree(templateId, input, display);
  const response = new ImageResponse(tree, { width: SIZE, height: SIZE, fonts });
  return await response.arrayBuffer();
}

function buildTree(templateId: TemplateId, input: InfographicInput, display: string) {
  switch (templateId) {
    case 'trend_line': return trendLine(input, display);
    case 'bar_trend': return barTrend(input, display);
    case 'comparison': return comparison(input, display);
    case 'stat_spotlight':
    default: return statSpotlight(input, display);
  }
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

function shell(display: string, children: ReactNode, opts: { bg?: string } = {}) {
  return (
    <div style={{
      width: SIZE, height: SIZE, display: 'flex', flexDirection: 'column',
      background: opts.bg ?? BLUE, padding: 70, color: WHITE, fontFamily: 'sans-serif',
      position: 'relative',
    }}>
      {/* Gold accent rail down the left edge */}
      <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: GOLD }} />
      {wordmark(display)}
      {children}
      {footer()}
    </div>
  );
}

function wordmark(display: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: 12, background: BLUE_DARK,
        border: `2px solid ${GOLD}`, fontSize: 34, fontWeight: 900, color: WHITE,
      }}>€</div>
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: WHITE, letterSpacing: 3, fontFamily: display }}>
        EUROSPENDING
      </div>
    </div>
  );
}

function footer() {
  return (
    <div style={{
      display: 'flex', marginTop: 'auto', justifyContent: 'space-between',
      width: '100%', fontSize: 18, color: MUTED,
    }}>
      <div style={{ display: 'flex' }}>eurospending.org</div>
      <div style={{ display: 'flex' }}>Source: Eurostat · ECB · IMF</div>
    </div>
  );
}

function eyebrow(country_label: string, sub: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', fontSize: 30, color: GOLD, letterSpacing: 3, textTransform: 'uppercase' }}>
        {country_label}
      </div>
      {sub ? <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>{sub}</div> : <div style={{ display: 'flex' }} />}
    </div>
  );
}

function headlineBlock(text: string) {
  return (
    <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, color: WHITE, fontWeight: 500, maxWidth: SIZE - 160 }}>
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template 1 — stat spotlight (giant number, like the population post)
// ---------------------------------------------------------------------------

function statSpotlight(input: InfographicInput, display: string) {
  const { fact, unit, country_label } = input;
  const sd = fact.supporting_data;
  // Most facts carry a numeric value; anniversaries carry years_ago instead.
  const valueStr = typeof sd.value === 'number'
    ? formatValue(sd.value, unit)
    : (typeof sd.years_ago === 'number' ? `${sd.years_ago} yrs` : '—');
  const ctx = contextLabel(fact);
  const subUnit = typeof sd.value === 'number' && unit ? `${unit} · ` : '';
  return shell(display, (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 40, gap: 18 }}>
      {eyebrow(country_label, `${subUnit}${formatPeriod(sd.period)}`)}
      <div style={{ display: 'flex', fontSize: 200, fontWeight: 800, lineHeight: 0.95, color: GOLD, fontFamily: display, letterSpacing: 2 }}>
        {valueStr}
      </div>
      {ctx ? (
        <div style={{ display: 'flex', alignSelf: 'flex-start', background: GOLD, color: BLUE_DARK, padding: '10px 18px', borderRadius: 10, fontSize: 24, fontWeight: 700 }}>
          {ctx}
        </div>
      ) : <div style={{ display: 'flex' }} />}
      <div style={{ display: 'flex', marginTop: 8 }}>{headlineBlock(fact.headline)}</div>
    </div>
  ));
}

// ---------------------------------------------------------------------------
// Template 2 — trend line (series over time)
// ---------------------------------------------------------------------------

function trendLine(input: InfographicInput, display: string) {
  const { fact, series, unit, country_label } = input;
  const valueStr = formatValue(fact.supporting_data.value, unit);
  const pts = downsample(series, 36);
  const chartW = SIZE - 140;
  const chartH = 300;

  return shell(display, (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, gap: 20 }}>
      {eyebrow(country_label, `${unit ? unit + ' · ' : ''}${formatPeriod(fact.supporting_data.period)}`)}
      {headlineBlock(fact.headline)}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, lineHeight: 1, color: GOLD, fontFamily: display }}>{valueStr}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 12 }}>
        {lineChartSvg(pts, chartW, chartH)}
      </div>
    </div>
  ));
}

function lineChartSvg(pts: DataPoint[], w: number, h: number) {
  if (pts.length < 2) return <div style={{ display: 'flex', height: h }} />;
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 20;
  const innerH = h - padY * 2;
  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = padY + (1 - (p.value - min) / range) * innerH;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'flex' }}>
      <polygon points={area} fill="rgba(255,204,0,0.18)" />
      <polyline points={line} fill="none" stroke={GOLD} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={12} fill={GOLD} stroke={WHITE} strokeWidth={4} />
    </svg>
  );
}

function triangleSvg(dir: 'up' | 'down', color: string) {
  const pts = dir === 'up' ? '11,2 22,20 0,20' : '0,2 22,2 11,20';
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" style={{ display: 'flex' }}>
      <polygon points={pts} fill={color} />
    </svg>
  );
}

function arrowRightSvg(color: string) {
  return (
    <svg width={70} height={28} viewBox="0 0 70 28" style={{ display: 'flex' }}>
      <line x1={0} y1={14} x2={52} y2={14} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <polygon points="50,2 70,14 50,26" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Template 3 — bar trend (vertical bars)
// ---------------------------------------------------------------------------

function barTrend(input: InfographicInput, display: string) {
  const { fact, series, unit, country_label } = input;
  const valueStr = formatValue(fact.supporting_data.value, unit);
  const bars = downsample(series, 24);
  const max = Math.max(...bars.map((p) => Math.abs(p.value)), 1);
  const gap = 8;
  const barW = Math.floor((SIZE - 140 - (bars.length - 1) * gap) / Math.max(bars.length, 1));

  return shell(display, (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, gap: 20 }}>
      {eyebrow(country_label, `${unit ? unit + ' · ' : ''}${formatPeriod(fact.supporting_data.period)}`)}
      {headlineBlock(fact.headline)}
      <div style={{ display: 'flex', fontSize: 150, fontWeight: 800, lineHeight: 1, color: GOLD, fontFamily: display }}>{valueStr}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 280, gap, marginTop: 12, borderBottom: `3px solid rgba(255,255,255,0.4)` }}>
        {bars.map((p, i) => (
          <div key={i} style={{
            display: 'flex', width: barW,
            height: Math.max(3, Math.round((Math.abs(p.value) / max) * 260)),
            background: i === bars.length - 1 ? GOLD : 'rgba(255,255,255,0.55)',
            borderRadius: '4px 4px 0 0',
          }} />
        ))}
      </div>
    </div>
  ));
}

// ---------------------------------------------------------------------------
// Template 4 — comparison (then vs now / threshold crossing)
// ---------------------------------------------------------------------------

function comparison(input: InfographicInput, display: string) {
  const { fact, unit, country_label } = input;
  const sd = fact.supporting_data;
  const nowVal = typeof sd.value === 'number' ? sd.value : NaN;
  const priorVal = typeof sd.prior_value === 'number'
    ? sd.prior_value
    : (typeof sd.prior_extreme_value === 'number' ? sd.prior_extreme_value : NaN);
  const priorLabel = typeof sd.prior_value === 'number' ? 'Previous' : 'Prior peak';
  const hasDelta = Number.isFinite(priorVal) && Number.isFinite(nowVal);
  const rising = hasDelta && nowVal >= priorVal;
  const deltaColor = rising ? POSITIVE : NEGATIVE;
  const deltaStr = hasDelta ? formatValue(Math.abs(nowVal - priorVal), unit) : '';

  return shell(display, (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36, gap: 24 }}>
      {eyebrow(country_label, `${unit ? unit + ' · ' : ''}${formatPeriod(fact.supporting_data.period)}`)}
      {headlineBlock(fact.headline)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 8 }}>
        {comparePane(priorLabel, formatValue(priorVal, unit), 'rgba(255,255,255,0.6)')}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {arrowRightSvg(WHITE)}
          {hasDelta ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: deltaColor, fontSize: 26, fontWeight: 800 }}>
              {triangleSvg(rising ? 'up' : 'down', deltaColor)}
              <div style={{ display: 'flex' }}>{deltaStr}</div>
            </div>
          ) : <div style={{ display: 'flex' }} />}
        </div>
        {comparePane('Now', formatValue(nowVal, unit), GOLD)}
      </div>
      {typeof sd.threshold === 'number' ? (
        <div style={{ display: 'flex', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.12)', padding: '10px 18px', borderRadius: 10, fontSize: 22, color: WHITE }}>
          {String(sd.threshold_label ?? 'Threshold')}: {formatValue(sd.threshold, unit)}
        </div>
      ) : <div style={{ display: 'flex' }} />}
    </div>
  ));
}

function comparePane(label: string, value: string, color: string) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
      <div style={{ display: 'flex', fontSize: 24, color: MUTED, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 110, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contextLabel(fact: CandidateFact): string {
  const sd = fact.supporting_data;
  switch (fact.rule_name) {
    case 'threshold_crossing':
      return sd.threshold_label ? String(sd.threshold_label) : '';
    case 'multi_year_extreme':
      return sd.lookback_periods ? `${sd.direction === 'low' ? 'Lowest' : 'Highest'} in ${sd.lookback_periods} periods` : '';
    case 'streak':
      return sd.streak_length ? `${sd.streak_length} periods ${sd.direction === 'down' ? 'falling' : 'rising'}` : '';
    case 'rank_change':
      return sd.direction === 'into_bottom3' ? 'EU bottom 3' : 'EU top 3';
    case 'anniversary':
      return sd.years_ago ? `${sd.years_ago} years ago` : '';
    default:
      return '';
  }
}

function downsample(arr: DataPoint[], n: number): DataPoint[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: DataPoint[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
  return out;
}

function formatValue(raw: unknown, unit: string): string {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return String(raw ?? '');
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
