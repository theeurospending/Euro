'use client';

import Link from 'next/link';

type Row = {
  iso_code: string;
  name: string;
  slug: string;
  flag_emoji: string | null;
  is_eu_member: boolean;
  is_eurozone_member: boolean;
  is_aggregate: boolean;
  narrative_updated_at: string | null;
};

export function CountriesAdminList({ countries }: { countries: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2">Country</th>
            <th className="px-3 py-2">ISO</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Narrative</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.iso_code} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="px-3 py-2"><span className="mr-1">{c.flag_emoji}</span>{c.name}</td>
              <td className="px-3 py-2 font-mono text-xs">{c.iso_code}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {c.is_aggregate ? 'aggregate' : c.is_eurozone_member ? 'eurozone' : c.is_eu_member ? 'EU non-€' : 'non-EU'}
              </td>
              <td className="px-3 py-2 text-xs">
                {c.narrative_updated_at ? <span className="text-green-700">updated {new Date(c.narrative_updated_at).toLocaleDateString()}</span> : <span className="text-zinc-400">empty</span>}
              </td>
              <td className="px-3 py-2 text-right">
                <Link href={`/admin/countries/${c.iso_code}`} className="text-xs text-blue-700 hover:underline">Edit →</Link>
                {!c.is_aggregate && (
                  <Link href={`/country/${c.slug}`} target="_blank" className="ml-3 text-xs text-zinc-500 hover:underline">View</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
