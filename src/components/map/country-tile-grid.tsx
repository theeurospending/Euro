'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import type { CountrySnapshot, HomepageMetric } from '@/lib/homepage-data';
import { HOMEPAGE_METRIC_LABELS } from '@/lib/homepage-data';
import { PALETTE } from '@/components/charts/palette';

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
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="kicker text-xs">Sort</span>
        <SortBtn current={sortBy} value="name" onClick={(v) => setSortBy(v)}>Name</SortBtn>
        {SORTABLE_METRICS.map((m) => (
          <SortBtn key={m} current={sortBy} value={m} onClick={(v) => setSortBy(v)}>{HOMEPAGE_METRIC_LABELS[m].label}</SortBtn>
        ))}
        <button
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="ml-1 rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
        >
          {sortDir === 'asc' ? '↑ asc' : '↓ desc'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <Link
            key={c.iso_code}
            href={`/country/${c.slug}`}
            className="surface group block p-5 transition-colors hover:border-[var(--brand-gold)]/40"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-3xl">{c.flag_emoji}</span>
              <span className="font-display text-xl text-white">{c.name}</span>
            </div>
            <div className="mt-4 space-y-2.5">
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{meta.label}</span>
        <span className="text-slate-600">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-300">{meta.label}</span>
      <span className="flex items-center gap-2.5">
        <Sparkline data={snap.spark} width={72} height={28} color={PALETTE.lav} />
        <span className="font-mono text-base font-medium text-white">{fmt(metric, snap.value)}</span>
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
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-[var(--brand-lav)] text-[var(--brand-navy)] font-medium'
          : 'border border-white/15 text-slate-300 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
