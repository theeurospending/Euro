'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import type { CountrySnapshot, HomepageMetric, MetricStatus } from '@/lib/homepage-data';
import { HOMEPAGE_METRIC_LABELS, metricStatus } from '@/lib/homepage-data';
import { PALETTE } from '@/components/charts/palette';

const SORTABLE_METRICS: HomepageMetric[] = [
  'gov_debt_pct_gdp',
  'gov_deficit_pct_gdp',
  'gdp_real_growth_pct',
  'hicp_annual_pct',
  'hicp_core_annual_pct',
  'unemployment_rate_pct',
  'housing_cost_overburden_pct',
  'gdp_per_capita_eur',
  'net_migration_rate',
];

const PRIMARY_STATS: HomepageMetric[] = [
  'gov_debt_pct_gdp',
  'hicp_annual_pct',
  'hicp_core_annual_pct',
  'unemployment_rate_pct',
  'housing_cost_overburden_pct',
  'net_migration_rate',
];

type SortMode = HomepageMetric | 'name';

export function CountryTileGrid({ countries }: { countries: CountrySnapshot[] }) {
  const [sortBy, setSortBy] = useState<SortMode>('gov_debt_pct_gdp');
  // For metric sorts, false = worst→best (worst first), true = best→worst.
  const [bestFirst, setBestFirst] = useState(false);

  const list = useMemo(() => countries.filter((c) => !c.is_aggregate), [countries]);

  const sorted = useMemo(() => {
    const arr = [...list];
    if (sortBy === 'name') {
      arr.sort((a, b) => a.name.localeCompare(b.name));
      return bestFirst ? arr.reverse() : arr;
    }
    const better = HOMEPAGE_METRIC_LABELS[sortBy].betterDirection;
    arr.sort((a, b) => {
      const va = a.metrics[sortBy]?.value ?? null;
      const vb = b.metrics[sortBy]?.value ?? null;
      if (va == null && vb == null) return a.name.localeCompare(b.name);
      if (va == null) return 1;   // missing data sinks to the bottom
      if (vb == null) return -1;
      // Worst first: when lower is better, the worst (highest) goes first.
      return better === 'low' ? vb - va : va - vb;
    });
    return bestFirst ? arr.reverse() : arr;
  }, [list, sortBy, bestFirst]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-navy)]/70">Sort</span>
        <SortBtn current={sortBy} value="name" onClick={setSortBy}>Name</SortBtn>
        {SORTABLE_METRICS.map((m) => (
          <SortBtn key={m} current={sortBy} value={m} onClick={setSortBy}>{HOMEPAGE_METRIC_LABELS[m].label}</SortBtn>
        ))}
        {sortBy !== 'name' && (
          <button
            onClick={() => setBestFirst((v) => !v)}
            className="ml-1 rounded-full border border-[var(--brand-navy)]/30 bg-[var(--brand-navy)]/[0.04] px-3.5 py-1.5 text-sm font-medium text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-navy)]/10"
          >
            {bestFirst ? 'Best first ↑' : 'Worst first ↓'}
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--brand-navy)]/70">
        <span className="flex items-center gap-1.5"><Dot status="ok" /> OK</span>
        <span className="flex items-center gap-1.5"><Dot status="risky" /> Watch</span>
        <span className="flex items-center gap-1.5"><Dot status="bad" /> Strained</span>
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
              <span className="ml-auto self-center">
                {c.is_eu_member ? (
                  <span title="EU member" className="rounded-full border border-[var(--brand-lav)]/40 px-2 py-0.5 text-[10px] text-[var(--brand-lav)]">🇪🇺 EU</span>
                ) : (
                  <span title="Not an EU member" className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-slate-400">non-EU</span>
                )}
              </span>
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
        <span className="flex items-center gap-2"><Dot status={null} /><span className="text-slate-400">{meta.label}</span></span>
        <span className="text-slate-600">—</span>
      </div>
    );
  }
  const status = metricStatus(metric, snap.value);
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <Dot status={status} />
        <span className="text-slate-300">{meta.label}</span>
      </span>
      <span className="flex items-center gap-2.5">
        <Sparkline data={snap.spark} width={72} height={28} color={PALETTE.lav} />
        <span className="font-mono text-base font-medium text-white">{fmt(metric, snap.value)}</span>
      </span>
    </div>
  );
}

function Dot({ status }: { status: MetricStatus | null }) {
  const color = status === 'ok' ? 'bg-emerald-400' : status === 'risky' ? 'bg-amber-400' : status === 'bad' ? 'bg-rose-500' : 'bg-slate-600';
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

function fmt(m: HomepageMetric, v: number): string {
  if (m === 'gdp_per_capita_eur') return `€${Math.round(v / 1000)}k`;
  if (m === 'net_migration_rate' || m === 'population_change_rate') return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
  return `${v.toFixed(1)}%`;
}

function SortBtn({ current, value, onClick, children }: { current: SortMode; value: SortMode; onClick: (v: SortMode) => void; children: React.ReactNode }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-[var(--brand-lav)] font-semibold text-[var(--brand-navy)]'
          : 'border border-[var(--brand-navy)]/30 bg-[var(--brand-navy)]/[0.04] text-[var(--brand-navy)] hover:bg-[var(--brand-navy)]/10'
      }`}
    >
      {children}
    </button>
  );
}
