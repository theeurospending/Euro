import { TimeSeriesLine } from '@/components/charts/time-series-line';
import type { FormatId } from '@/components/charts/formatters';
import { nthCountryColor } from '@/components/charts/palette';
import type { CompareSeries, ComparableMetric } from '@/lib/compare-data';

export function CompareChart({ series, metric }: { series: CompareSeries[]; metric: ComparableMetric | undefined }) {
  if (!metric) return <div className="text-sm text-zinc-500">Unknown metric.</div>;
  const format: FormatId = chooseFormat(metric);
  const lines = series.map((s, i) => ({
    label: `${s.flag_emoji ?? ''} ${s.country_name}`,
    color: nthCountryColor(i),
    data: s.data.map((p) => ({ period_start: p.period_start, value: p.value })),
  }));
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-sm font-medium">{metric.display_name}</div>
      <div className="text-xs text-zinc-500">{metric.unit} · {metric.frequency}</div>
      <div className="mt-3">
        <TimeSeriesLine series={lines} format={format} height={420} />
      </div>
    </div>
  );
}

function chooseFormat(m: ComparableMetric): FormatId {
  if (m.unit.includes('%')) return 'pct1';
  if (m.unit.toLowerCase().includes('eur')) return 'int';
  return 'plain';
}
