import type { LeaderboardRow, ComparableMetric } from '@/lib/compare-data';

export function Leaderboard({ rows, metric }: { rows: LeaderboardRow[]; metric: ComparableMetric | undefined }) {
  if (!metric) return <div className="text-sm text-zinc-500">Unknown metric.</div>;
  if (rows.length === 0) {
    return <div className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400">No data for this metric.</div>;
  }
  const fmt = (v: number | null): string => {
    if (v == null) return '—';
    if (metric.unit.includes('%')) return `${v.toFixed(2)}%`;
    if (metric.unit.toLowerCase().includes('eur')) return Math.round(v).toLocaleString();
    return v.toFixed(2);
  };
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Country</th>
            <th className="px-3 py-2 text-right">Latest ({rows[0]?.latest_period?.slice(0, 7)})</th>
            <th className="px-3 py-2 text-right">YoY Δ</th>
            <th className="px-3 py-2 text-right">5y Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.country_iso} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="px-3 py-2 text-xs text-zinc-500">{i + 1}</td>
              <td className="px-3 py-2"><span className="mr-1">{r.flag_emoji}</span>{r.country_name}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(r.latest_value)}</td>
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
  if (v == null) return 'text-zinc-400';
  return v > 0 ? 'text-red-700' : v < 0 ? 'text-green-700' : 'text-zinc-500';
}
function deltaSign(v: number | null): string {
  if (v == null || v === 0) return '';
  return v > 0 ? '+' : '';
}
