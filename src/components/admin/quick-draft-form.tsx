'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimeSeriesLine } from '@/components/charts/time-series-line';

type Country = { iso_code: string; name: string; flag_emoji: string | null; is_eu_member: boolean; is_eurozone_member: boolean; is_aggregate: boolean };
type Metric = { key: string; display_name: string; unit: string; frequency: string };

export function QuickDraftForm({ countries, metrics }: { countries: Country[]; metrics: Metric[] }) {
  const router = useRouter();
  const [trending, setTrending] = useState('');
  const [countryIso, setCountryIso] = useState<string>('DE');
  const [metricKey, setMetricKey] = useState<string>(metrics[0]?.key ?? '');
  const [headlineOverride, setHeadlineOverride] = useState('');
  const [preview, setPreview] = useState<{ period_start: string; value: number }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ draft_id: number } | null>(null);

  // Fetch preview series when country/metric changes.
  useEffect(() => {
    if (!countryIso || !metricKey) return;
    setPreviewLoading(true);
    const controller = new AbortController();
    fetch(`/api/admin/social-media/quick-draft/preview?country=${countryIso}&metric=${metricKey}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => { if (j.series) setPreview(j.series); })
      .catch(() => {/* ignore aborts */})
      .finally(() => setPreviewLoading(false));
    return () => controller.abort();
  }, [countryIso, metricKey]);

  async function generate() {
    setBusy(true); setError(null); setGenerated(null);
    try {
      const res = await fetch('/api/admin/social-media/quick-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          country_iso: countryIso,
          metric_key: metricKey,
          trending_note: trending,
          headline_override: headlineOverride || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setGenerated({ draft_id: json.draft_id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  const activeMetric = metrics.find((m) => m.key === metricKey);
  const activeCountry = countries.find((c) => c.iso_code === countryIso);

  return (
    <div className="space-y-4">
      <Field label="What's trending?" hint="Free-form context — what conversation are we joining?">
        <textarea value={trending} onChange={(e) => setTrending(e.target.value)} rows={3} className={inputClass} placeholder="e.g. Greek bond yields back in the news after S&P upgrade…" />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Country">
          <select value={countryIso} onChange={(e) => setCountryIso(e.target.value)} className={inputClass}>
            {countries.filter((c) => !c.is_aggregate).map((c) => (
              <option key={c.iso_code} value={c.iso_code}>{c.flag_emoji} {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Metric">
          <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)} className={inputClass}>
            {metrics.map((m) => <option key={m.key} value={m.key}>{m.display_name} ({m.unit})</option>)}
          </select>
        </Field>
      </div>

      {/* Chart preview */}
      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="text-xs text-zinc-500">Preview: {activeCountry?.name} · {activeMetric?.display_name}</div>
        <div className="mt-2">
          {previewLoading ? (
            <div className="flex h-40 items-center justify-center text-xs text-zinc-400">Loading…</div>
          ) : preview.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-xs text-zinc-400">No data for this combo</div>
          ) : (
            <TimeSeriesLine
              series={[{ label: activeCountry?.name ?? '', data: preview }]}
              format={activeMetric?.unit.includes('%') ? 'pct1' : 'plain'}
              height={200}
            />
          )}
        </div>
      </div>

      <Field label="Headline override (optional)" hint="If set, replaces the auto-generated headline used in the caption prompt.">
        <input type="text" value={headlineOverride} onChange={(e) => setHeadlineOverride(e.target.value)} className={inputClass} />
      </Field>

      {error && <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {generated && (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          Draft #{generated.draft_id} created. <a className="underline" href="/admin/social-media/drafts">Open drafts →</a>
        </div>
      )}

      <button onClick={generate} disabled={busy || !countryIso || !metricKey || preview.length === 0}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
        {busy ? 'Generating…' : 'Generate draft'}
      </button>
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
