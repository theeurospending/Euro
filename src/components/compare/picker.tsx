'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ComparableMetric } from '@/lib/compare-data';

const EU27 = [
  { iso: 'AT', name: 'Austria',        flag: '🇦🇹' },
  { iso: 'BE', name: 'Belgium',        flag: '🇧🇪' },
  { iso: 'BG', name: 'Bulgaria',       flag: '🇧🇬' },
  { iso: 'HR', name: 'Croatia',        flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus',         flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czech Rep.',     flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark',        flag: '🇩🇰' },
  { iso: 'EE', name: 'Estonia',        flag: '🇪🇪' },
  { iso: 'FI', name: 'Finland',        flag: '🇫🇮' },
  { iso: 'FR', name: 'France',         flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany',        flag: '🇩🇪' },
  { iso: 'GR', name: 'Greece',         flag: '🇬🇷' },
  { iso: 'HU', name: 'Hungary',        flag: '🇭🇺' },
  { iso: 'IE', name: 'Ireland',        flag: '🇮🇪' },
  { iso: 'IT', name: 'Italy',          flag: '🇮🇹' },
  { iso: 'LV', name: 'Latvia',         flag: '🇱🇻' },
  { iso: 'LT', name: 'Lithuania',      flag: '🇱🇹' },
  { iso: 'LU', name: 'Luxembourg',     flag: '🇱🇺' },
  { iso: 'MT', name: 'Malta',          flag: '🇲🇹' },
  { iso: 'NL', name: 'Netherlands',    flag: '🇳🇱' },
  { iso: 'PL', name: 'Poland',         flag: '🇵🇱' },
  { iso: 'PT', name: 'Portugal',       flag: '🇵🇹' },
  { iso: 'RO', name: 'Romania',        flag: '🇷🇴' },
  { iso: 'SK', name: 'Slovakia',       flag: '🇸🇰' },
  { iso: 'SI', name: 'Slovenia',       flag: '🇸🇮' },
  { iso: 'ES', name: 'Spain',          flag: '🇪🇸' },
  { iso: 'SE', name: 'Sweden',         flag: '🇸🇪' },
  { iso: 'EZ', name: 'Eurozone',       flag: '🇪🇺' },
];

const RANGES: { label: string; from: number | null }[] = [
  { label: 'All',  from: null },
  { label: '10y',  from: new Date().getUTCFullYear() - 10 },
  { label: '5y',   from: new Date().getUTCFullYear() - 5 },
  { label: '1y',   from: new Date().getUTCFullYear() - 1 },
];

export function ComparePicker({
  availableMetrics, selectedCountries, selectedMetric, selectedFromYear, selectedView,
}: {
  availableMetrics: ComparableMetric[];
  selectedCountries: string[];
  selectedMetric: string;
  selectedFromYear: number | null;
  selectedView: 'chart' | 'leaderboard';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  function navigate(updates: Partial<{ countries: string[]; metric: string; from: number | null; view: string }>) {
    const params = new URLSearchParams();
    const countries = updates.countries ?? selectedCountries;
    const metric = updates.metric ?? selectedMetric;
    const from = updates.from !== undefined ? updates.from : selectedFromYear;
    const view = updates.view ?? selectedView;
    if (countries.length > 0) params.set('countries', countries.join(','));
    if (metric) params.set('metric', metric);
    if (from != null) params.set('from', String(from));
    if (view !== 'chart') params.set('view', view);
    router.push(`${pathname}${params.toString() ? `?${params}` : ''}`);
  }

  function toggleCountry(iso: string) {
    if (selectedCountries.includes(iso)) {
      navigate({ countries: selectedCountries.filter((c) => c !== iso) });
    } else {
      navigate({ countries: [...selectedCountries, iso] });
    }
  }

  const filtered = search ? EU27.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.iso.toLowerCase().includes(search.toLowerCase())) : EU27;

  return (
    <div className="mt-6 space-y-4">
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2">
        {selectedCountries.map((iso) => {
          const c = EU27.find((x) => x.iso === iso);
          if (!c) return null;
          return (
            <button
              key={iso}
              onClick={() => toggleCountry(iso)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-zinc-900"
            >
              {c.flag} {c.name} <span className="text-zinc-400">×</span>
            </button>
          );
        })}
      </div>

      {/* Search + pick more */}
      <details className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <summary className="cursor-pointer text-sm font-medium">Add / remove countries</summary>
        <input
          type="search"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
          {filtered.map((c) => {
            const active = selectedCountries.includes(c.iso);
            return (
              <button
                key={c.iso}
                onClick={() => toggleCountry(c.iso)}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                <span>{c.flag}</span><span className="truncate">{c.name}</span>
              </button>
            );
          })}
        </div>
      </details>

      {/* Metric select */}
      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Metric</span>
        <select
          value={selectedMetric}
          onChange={(e) => navigate({ metric: e.target.value })}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {availableMetrics.map((m) => (
            <option key={m.key} value={m.key}>{m.display_name} ({m.unit})</option>
          ))}
        </select>
      </label>

      {/* Range + view toggles */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {RANGES.map((r) => {
            const active = r.from === selectedFromYear;
            return (
              <button
                key={r.label}
                onClick={() => navigate({ from: r.from })}
                className={`rounded-full px-3 py-1 text-xs ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex gap-1">
          <button
            onClick={() => navigate({ view: 'chart' })}
            className={`rounded-full px-3 py-1 text-xs ${selectedView === 'chart' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
          >
            Chart
          </button>
          <button
            onClick={() => navigate({ view: 'leaderboard' })}
            className={`rounded-full px-3 py-1 text-xs ${selectedView === 'leaderboard' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
