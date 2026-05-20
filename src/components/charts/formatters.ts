// Serialisable formatter identifiers — usable across Server/Client boundary.
// Server components pass a string; chart components resolve it on the client.

export type FormatId = 'pct0' | 'pct1' | 'pct2' | 'int' | 'eur' | 'eurM' | 'eurB' | 'plain';

export function formatValue(v: number, id: FormatId | undefined): string {
  if (id == null) return v.toString();
  switch (id) {
    case 'pct0': return `${v.toFixed(0)}%`;
    case 'pct1': return `${v.toFixed(1)}%`;
    case 'pct2': return `${v.toFixed(2)}%`;
    case 'int':  return Math.round(v).toLocaleString();
    case 'eur':  return `€${v.toLocaleString()}`;
    case 'eurM': return `€${v.toLocaleString()}M`;
    case 'eurB': return v >= 1000 ? `€${(v / 1000).toFixed(1)}B` : `€${v.toFixed(0)}M`;
    case 'plain':return v.toFixed(2);
  }
}
