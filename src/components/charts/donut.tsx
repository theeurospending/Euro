'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { nthCountryColor } from './palette';
import { formatValue, type FormatId } from './formatters';

export type DonutSlice = { name: string; value: number; color?: string };

export function Donut({
  data,
  height = 280,
  innerRadius = 60,
  outerRadius = 100,
  format,
}: {
  data: DonutSlice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  format?: FormatId;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="flex h-40 items-center justify-center rounded border border-dashed border-zinc-300 text-xs text-zinc-400">No data</div>;
  }
  const fmt = (v: number) => formatValue(v, format);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={1}
          isAnimationActive={false}
        >
          {data.map((slice, i) => (
            <Cell key={i} fill={slice.color ?? nthCountryColor(i)} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => (typeof v === 'number' ? fmt(v) : String(v ?? ''))} contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
