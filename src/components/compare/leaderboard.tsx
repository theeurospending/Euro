import type { LeaderboardRow, ComparableMetric } from '@/lib/compare-data';

export function Leaderboard({ rows, metric }: { rows: LeaderboardRow[]; metric: ComparableMetric | undefined }) {
  if (!metric) return <div className="text-sm text-slate-400">Unknown metric.</div>;
  if (rows.length === 0) {
    return <div className="surface p-8 text-center text-sm text-slate-400">No data for this metric.</div>;
  }
  const fmt = (v: number | null): string => {
    if (v == null) return '—';
    if (metric.unit.includes('%')) return `${v.toFixed(2)}%`;
    if (metric.unit.toLowerCase().includes('eur')) return Math.round(v).toLocaleString();
    return v.toFixed(2);
  };
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-sm text-slate-200">
        <thead className="border-b border-white/10 bg-white/[0.03] text-left">
          <tr className="font-mono text-xs uppercase tracking-wider text-slate-400">
            <th className="px-3 py-3">#</th>
            <th className="px-3 py-3">Country</th>
            <th className="px-3 py-3 text-right">Latest ({rows[0]?.latest_period?.slice(0, 7)})</th>
            <th className="px-3 py-3 text-right">YoY Δ</th>
            <th className="px-3 py-3 text-right">5y Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.country_iso} className="border-t border-white/5">
              <td className="px-3 py-2 font-mono text-xs text-slate-500">{i + 1}</td>
              <td className="px-3 py-2"><span className="mr-1.5">{r.flag_emoji}</span>{r.country_name}</td>
              <td className="px-3 py-2 text-right font-mono text-white">{fmt(r.latest_value)}</td>
              <td className={`px-3 py-2 text-right font-mono ${deltaColor(r.yoy_delta_abs)}`}>{deltaSign(r.yoy_delta_abs)}{fmt(r.yoy_delta_abs)}</td>
              <td className={`px-3 py-2 text-right font-mono ${deltaColor(r.five_year_delta_abs)}`}>{deltaSign(r.five_year_delta_abs)}{fmt(r.five_year_delta_abs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function deltaColor(v: number | null): string {
  if (v == null) return 'text-slate-500';
  return v > 0 ? 'text-rose-300' : v < 0 ? 'text-teal-300' : 'text-slate-400';
}
function deltaSign(v: number | null): string {
  if (v == null || v === 0) return '';
  return v > 0 ? '+' : '';
}
