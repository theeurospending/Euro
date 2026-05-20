'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import type { CountrySnapshot, HomepageMetric } from '@/lib/homepage-data';
import { HOMEPAGE_METRIC_LABELS } from '@/lib/homepage-data';

const SORTABLE_METRICS: HomepageMetric[] = [
  'gov_debt_pct_gdp',
  'gov_deficit_pct_gdp',
  'gdp_real_growth_pct',
  'hicp_annual_pct',
  'gdp_per_capita_eur',
];

const PRIMARY_STATS: HomepageMetric[] = [
  'gov_debt_pct_gdp',
  'hicp_annual_pct',
  'unemployment_rate_pct',
];

type SortMode = HomepageMetric | 'name';
type SortDir = 'asc' | 'desc';

export function CountryTileGrid({ countries }: { countries: CountrySnapshot[] }) {
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Only EU members on the grid.
  const eu = useMemo(() => countries.filter((c) => c.is_eu_member && !c.is_aggregate), [countries]);

  const sorted = useMemo(() => {
    const arr = [...eu];
    arr.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const va = a.metrics[sortBy]?.value ?? null;
      const vb = b.metrics[sortBy]?.value ?? null;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return va - vb;
    });
    return sortDir === 'desc' ? arr.reverse() : arr;
  }, [eu, sortBy, sortDir]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Sort:</span>
        <SortBtn current={sortBy} value="name" onClick={(v) => setSortBy(v)}>Name</SortBtn>
        {SORTABLE_METRICS.map((m) => (
          <SortBtn key={m} current={sortBy} value={m} onClick={(v) => setSortBy(v)}>{HOMEPAGE_METRIC_LABELS[m].label}</SortBtn>
        ))}
        <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="ml-1 rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          {sortDir === 'asc' ? '↑ asc' : '↓ desc'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((c) => (
          <Link key={c.iso_code} href={`/country/${c.slug}`} className="rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{c.flag_emoji}</span>
              <span className="text-sm font-semibold">{c.name}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {PRIMARY_STATS.map((m) => (
                <Stat key={m} metric={m} snap={c.metrics[m]} />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ metric, snap }: { metric: HomepageMetric; snap: CountrySnapshot['metrics'][HomepageMetric] }) {
  const meta = HOMEPAGE_METRIC_LABELS[metric];
  if (!snap) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{meta.label}</span>
        <span className="text-zinc-400">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{meta.label}</span>
      <span className="flex items-center gap-1">
        <Sparkline data={snap.spark} width={36} height={16} />
        <span className="font-mono">{fmt(metric, snap.value)}</span>
      </span>
    </div>
  );
}

function fmt(m: HomepageMetric, v: number): string {
  if (m === 'gdp_per_capita_eur') return `€${Math.round(v / 1000)}k`;
  return `${v.toFixed(1)}%`;
}

function SortBtn({ current, value, onClick, children }: { current: SortMode; value: SortMode; onClick: (v: SortMode) => void; children: React.ReactNode }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-full px-2 py-1 ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
    >
      {children}
    </button>
  );
}
