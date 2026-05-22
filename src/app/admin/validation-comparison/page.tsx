import Link from 'next/link';
import { loadValidationComparison } from '@/lib/validation-comparison';

export const dynamic = 'force-dynamic';

export default async function ValidationComparison() {
  const groups = await loadValidationComparison();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="kicker text-[var(--brand-navy)]/60">Cross-validation</div>
          <h1 className="font-display mt-2 text-3xl text-[var(--brand-navy)]">Source disagreements</h1>
          <p className="mt-1 text-sm text-[var(--brand-navy)]/60">
            Rows where Eurostat and IMF WEO disagree by more than the threshold for the same country and period.
            Forecast-era rows highlighted separately — modest forecast diffs are normal.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-[var(--brand-navy)]/60 underline">← Admin</Link>
      </div>

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.primary}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-xl text-[var(--brand-navy)]">{g.label}</h2>
              <span className="font-mono text-xs text-[var(--brand-navy)]/60">
                threshold &gt; {g.threshold_abs}{g.unit.includes('%') ? '%' : ''} · {g.rows.length} row{g.rows.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--brand-navy)]/50">
              {g.primary} vs {g.secondary}
            </div>

            {g.rows.length === 0 ? (
              <div className="mt-3 rounded border border-dashed border-[var(--brand-navy)]/15 p-6 text-center text-sm text-[var(--brand-navy)]/50">
                No disagreements above threshold.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--brand-navy)]/10 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-[var(--brand-navy)]/10 bg-[var(--brand-navy)]/[0.03] text-left">
                    <tr className="font-mono text-[10px] uppercase tracking-wider text-[var(--brand-navy)]/60">
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2 text-right">{g.primary}</th>
                      <th className="px-3 py-2 text-right">{g.secondary}</th>
                      <th className="px-3 py-2 text-right">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={`${r.country_iso}-${r.period_start}`} className="border-t border-[var(--brand-navy)]/5">
                        <td className="px-3 py-2"><span className="mr-1.5">{r.flag_emoji}</span>{r.country_name}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {r.period_start.slice(0, 7)}
                          {r.is_forecast_period && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">forecast</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{r.primary_value.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.secondary_value.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{r.abs_diff.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 rounded border border-[var(--brand-navy)]/10 bg-white p-4 text-xs text-[var(--brand-navy)]/60">
        <strong className="text-[var(--brand-navy)]">Notes:</strong> IMF WEO data is updated April and October.
        Differences typically reflect Eurostat using newer EDP notification data vs IMF&apos;s vintage. For forecast
        years, modest disagreement is expected. Persistent large gaps for the same country+metric warrant a manual
        check of the source URLs in the data_sources table.
      </div>
    </main>
  );
}
