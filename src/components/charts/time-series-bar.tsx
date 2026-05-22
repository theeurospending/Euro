'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { PALETTE } from './palette';
import { formatValue, type FormatId } from './formatters';

export type BarPoint = { period_start: string; value: number };

export function TimeSeriesBar({
  data,
  yLabel,
  height = 320,
  positiveColor = PALETTE.positive,
  negativeColor = PALETTE.negative,
  format,
  thresholds,
}: {
  data: BarPoint[];
  yLabel?: string;
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  format?: FormatId;
  thresholds?: { value: number; label: string; color?: string }[];
}) {
  if (data.length === 0) {
    return <div className="flex h-32 items-center justify-center rounded border border-dashed border-white/15 text-xs text-slate-500">No data</div>;
  }
  const fmt = (v: number) => formatValue(v, format);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid stroke={PALETTE.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="period_start" tick={{ fill: PALETTE.axis, fontSize: 11 }} tickFormatter={(v) => String(v).slice(0, 4)} interval="preserveStartEnd" />
        <YAxis
          tick={{ fill: PALETTE.axis, fontSize: 11 }}
          tickFormatter={(v) => fmt(Number(v))}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fill: PALETTE.axis, fontSize: 11 } } : undefined}
        />
        <Tooltip
          formatter={(v) => (typeof v === 'number' ? fmt(v) : String(v ?? ''))}
          contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid ' + PALETTE.grid, borderRadius: 4, fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke={PALETTE.axis} />
        {thresholds?.map((t, i) => (
          <ReferenceLine
            key={i}
            y={t.value}
            stroke={t.color ?? PALETTE.warning}
            strokeDasharray="4 2"
            label={{ value: t.label, position: 'right', fill: PALETTE.axis, fontSize: 10 }}
          />
        ))}
        <Bar dataKey="value" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? positiveColor : negativeColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
