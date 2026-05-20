'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { PALETTE } from './palette';

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = PALETTE.primary,
}: {
  data: { value: number }[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length < 2) {
    return <span className="inline-block text-xs text-slate-500">—</span>;
  }
  return (
    <div style={{ width, height }} className="inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 1, bottom: 1, left: 1, right: 1 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
