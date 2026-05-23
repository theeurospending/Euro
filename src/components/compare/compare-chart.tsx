import { TimeSeriesLine } from '@/components/charts/time-series-line';
import type { FormatId } from '@/components/charts/formatters';
import { nthCountryColor } from '@/components/charts/palette';
import { MetricInfoLink } from '@/components/ui/metric-info-link';
import type { CompareSeries, ComparableMetric } from '@/lib/compare-data';

export function CompareChart({ series, metric }: { series: CompareSeries[]; metric: ComparableMetric | undefined }) {
  if (!metric) return <div className="text-sm text-slate-400">Unknown metric.</div>;
  const format: FormatId = chooseFormat(metric);
  const lines = series.map((s, i) => ({
    label: `${s.flag_emoji ?? ''} ${s.country_name}`,
    color: nthCountryColor(i),
    data: s.data.map((p) => ({ period_start: p.period_start, value: p.value })),
  }));
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-1.5 font-display text-sm tracking-wide text-white">
        {metric.display_name}
        <MetricInfoLink metricKey={metric.key} />
      </div>
      <div className="mt-0.5 font-mono text-xs text-slate-400">{metric.unit} · {metric.frequency}</div>
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
