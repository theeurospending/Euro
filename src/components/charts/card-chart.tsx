'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Compact line chart for the homepage country cards: a year X-axis and a hover
// tooltip that shows the year + formatted value.
export function CardChart({
  data,
  color,
  format,
}: {
  data: { period: string; value: number }[];
  color: string;
  format: (v: number) => string;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center rounded border border-dashed border-white/10 text-xs text-slate-500">
        no series yet
      </div>
    );
  }
  const rows = data.map((d) => ({ year: d.period.slice(0, 4), value: d.value }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
          minTickGap={24}
        />
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.25)' }}
          contentStyle={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#ffffff' }}
          formatter={(value) => [format(typeof value === 'number' ? value : Number(value)), '']}
          labelFormatter={(l) => `Year ${l}`}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
