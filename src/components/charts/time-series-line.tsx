'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import { PALETTE, nthCountryColor } from './palette';
import { formatValue, type FormatId } from './formatters';

export type LineSeries = {
  label: string;
  color?: string;
  data: { period_start: string; value: number }[];
  dashed?: boolean;
};

export type LineEventMarker = {
  date: string;
  label: string;
  color?: string;
};

export type TimeSeriesLineProps = {
  series: LineSeries[];
  yLabel?: string;
  height?: number;
  events?: LineEventMarker[];
  format?: FormatId;
};

export function TimeSeriesLine({ series, yLabel, height = 280, events, format }: TimeSeriesLineProps) {
  if (series.length === 0 || series.every((s) => s.data.length === 0)) {
    return <EmptyState />;
  }
  const merged = mergeSeries(series);
  const fmt = (v: number) => formatValue(v, format);

  const ariaLabel = `Line chart: ${series.map((s) => s.label).join(', ')}${yLabel ? ` — ${yLabel}` : ''}`;
  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" />
        <XAxis dataKey="period_start" tick={{ fill: PALETTE.axis, fontSize: 11 }} tickFormatter={(v) => String(v).slice(0, 4)} interval="preserveStartEnd" />
        <YAxis
          tick={{ fill: PALETTE.axis, fontSize: 11 }}
          tickFormatter={(v) => fmt(Number(v))}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fill: PALETTE.axis, fontSize: 11 } } : undefined}
        />
        <Tooltip
          labelFormatter={(v) => String(v)}
          formatter={(v) => (typeof v === 'number' ? fmt(v) : String(v ?? ''))}
          contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid ' + PALETTE.grid, borderRadius: 4, fontSize: 12 }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {events?.map((e, i) => (
          <ReferenceLine
            key={i}
            x={e.date}
            stroke={e.color ?? PALETTE.forecast}
            strokeDasharray="3 3"
            label={{ value: e.label, position: 'top', fill: PALETTE.primaryDim, fontSize: 10 }}
          />
        ))}
        {series.map((s, i) => (
          <Line
            key={s.label}
            type="monotone"
            dataKey={s.label}
            stroke={s.color ?? nthCountryColor(i)}
            strokeWidth={2}
            dot={false}
            strokeDasharray={s.dashed ? '4 2' : undefined}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}

function mergeSeries(series: LineSeries[]): Array<Record<string, number | string>> {
  const byDate = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const p of s.data) {
      const row = byDate.get(p.period_start) ?? { period_start: p.period_start };
      row[s.label] = p.value;
      byDate.set(p.period_start, row);
    }
  }
  return [...byDate.values()].sort((a, b) => String(a.period_start).localeCompare(String(b.period_start)));
}

function EmptyState() {
  return (
    <div className="flex h-40 items-center justify-center rounded border border-dashed border-white/15 text-xs text-slate-500">
      No data
    </div>
  );
}
