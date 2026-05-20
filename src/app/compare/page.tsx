import type { Metadata } from 'next';
import { listComparableMetrics, loadCompareSeries, loadLeaderboard } from '@/lib/compare-data';
import { ComparePicker } from '@/components/compare/picker';
import { CompareChart } from '@/components/compare/compare-chart';
import { Leaderboard } from '@/components/compare/leaderboard';
import { SiteHeader } from '@/components/layout/site-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare EU countries',
  description: 'Overlay any metric for any combination of EU countries.',
};

const DEFAULT_COUNTRIES = ['DE', 'FR', 'IT', 'ES'];
const DEFAULT_METRIC = 'gov_debt_pct_gdp';

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ countries?: string; metric?: string; from?: string; view?: string }> }) {
  const params = await searchParams;
  const countries = (params.countries ?? DEFAULT_COUNTRIES.join(',')).split(',').filter(Boolean);
  const metric = params.metric ?? DEFAULT_METRIC;
  const fromYear = params.from ? parseInt(params.from, 10) : null;
  const view = (params.view ?? 'chart') === 'leaderboard' ? 'leaderboard' : 'chart';

  const metrics = await listComparableMetrics();
  const activeMetric = metrics.find((m) => m.key === metric) ?? metrics[0];

  const [series, leaderboard] = await Promise.all([
    view === 'chart' ? loadCompareSeries(countries, metric, fromYear) : Promise.resolve([]),
    view === 'leaderboard' ? loadLeaderboard(metric) : Promise.resolve([]),
  ]);

  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      <div className="kicker">Side-by-side</div>
      <h1 className="font-display mt-3 text-5xl tracking-tight text-white">Compare</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">
        Pick countries and a metric. URL is shareable:{' '}
        <code className="font-mono text-xs text-[var(--brand-lav)]">?countries=DE,FR&amp;metric=gov_debt_pct_gdp&amp;from=2008</code>
      </p>

      <ComparePicker
        availableMetrics={metrics}
        selectedCountries={countries}
        selectedMetric={metric}
        selectedFromYear={fromYear}
        selectedView={view}
      />

      <div className="mt-6">
        {view === 'chart' ? (
          <CompareChart
            series={series}
            metric={activeMetric}
          />
        ) : (
          <Leaderboard rows={leaderboard} metric={activeMetric} />
        )}
      </div>
    </main>
    </>
  );
}
