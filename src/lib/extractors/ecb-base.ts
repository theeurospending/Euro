// ECB Statistical Data Warehouse client. Fetches single-series SDMX-JSON
// responses (one series_key per call) and emits a flat array of observations.
//
// Docs: https://data.ecb.europa.eu/help/api/data
// Format: jsondata (SDMX-JSON 1.0)

const ECB_ROOT = 'https://data-api.ecb.europa.eu/service/data';

export type EcbObservation = {
  period_start: string;     // ISO date YYYY-MM-DD for daily; first-of-month YYYY-MM-01 for monthly; week-start for weekly
  value: number;
  flags?: string;           // SDMX OBS_STATUS code (A=normal, M=missing, etc.)
  raw_period: string;       // original ECB period code (e.g. "2024-W12", "2024-01")
};

type SdmxJson = {
  dataSets: Array<{
    series: Record<string, {
      observations: Record<string, [number | null, number?, number?, unknown?, unknown?]>;
    }>;
  }>;
  structure: {
    dimensions: {
      observation: Array<{
        id: string;
        values: Array<{ id: string; name?: string; start?: string; end?: string }>;
      }>;
    };
  };
};

/**
 * Fetch a single ECB SDMX-JSON series.
 *
 * @param dataset  flow ref, e.g. 'FM', 'BSI', 'EXR', 'ICP', 'ILM'
 * @param seriesKey dot-separated series key, e.g. 'D.U2.EUR.4F.KR.MRR_FR.LEV'
 * @param opts.startPeriod inclusive ISO date or year-month
 */
export async function fetchEcb(
  dataset: string,
  seriesKey: string,
  opts: { startPeriod?: string; endPeriod?: string } = {},
): Promise<EcbObservation[]> {
  const url = new URL(`${ECB_ROOT}/${dataset}/${seriesKey}`);
  url.searchParams.set('format', 'jsondata');
  if (opts.startPeriod) url.searchParams.set('startPeriod', opts.startPeriod);
  if (opts.endPeriod) url.searchParams.set('endPeriod', opts.endPeriod);

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404 && body.includes('No results found')) return [];
    throw new Error(`ECB ${dataset}/${seriesKey} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  if (!text.trim()) return [];   // ECB returns empty body when there's no data
  let json: SdmxJson;
  try {
    json = JSON.parse(text) as SdmxJson;
  } catch {
    throw new Error(`ECB ${dataset}/${seriesKey}: invalid JSON response`);
  }

  if (!json.dataSets?.[0]?.series) return [];

  // Single-series fetches: there's exactly one series entry; key is e.g. "0:0:0:0:0:0:0".
  const seriesEntry = Object.values(json.dataSets[0].series)[0];
  if (!seriesEntry?.observations) return [];

  const timeDim = json.structure.dimensions.observation.find((d) => d.id === 'TIME_PERIOD');
  if (!timeDim) throw new Error(`ECB ${dataset}/${seriesKey}: TIME_PERIOD dimension missing`);

  const out: EcbObservation[] = [];
  for (const [idxStr, obs] of Object.entries(seriesEntry.observations)) {
    const timeIdx = parseInt(idxStr, 10);
    const timeVal = timeDim.values[timeIdx];
    if (!timeVal) continue;
    const value = obs[0];
    if (value == null || !Number.isFinite(value)) continue;
    out.push({
      raw_period: timeVal.id,
      period_start: ecbPeriodToDate(timeVal.id, timeVal.start),
      value,
      // OBS_STATUS conventionally lives at obs[1] mapped via attribute structure; we keep it simple.
    });
  }
  // Sort by period for predictable downstream behaviour.
  out.sort((a, b) => a.period_start.localeCompare(b.period_start));
  return out;
}

/**
 * Convert an ECB period code (daily / monthly / weekly / quarterly / annual)
 * into our canonical period_start (YYYY-MM-DD).
 *
 * - Daily:   "2024-01-15"          → "2024-01-15"
 * - Monthly: "2024-01"             → "2024-01-01"
 * - Quarterly: "2024-Q1"           → "2024-01-01"
 * - Weekly: "2024-W12"             → use the `start` attribute if provided, otherwise compute ISO week start
 * - Annual: "2024"                 → "2024-01-01"
 * - Half-yearly: "2024-S1" / "S2"  → "2024-01-01" / "2024-07-01"
 */
export function ecbPeriodToDate(period: string, startHint?: string): string {
  // ECB increasingly provides a `start` ISO date on observation values — use it if present.
  if (startHint && /^\d{4}-\d{2}-\d{2}/.test(startHint)) {
    return startHint.slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return period;
  if (/^\d{4}-\d{2}$/.test(period)) return `${period}-01`;
  if (/^\d{4}$/.test(period)) return `${period}-01-01`;

  const q = period.match(/^(\d{4})-Q([1-4])$/);
  if (q) {
    const month = (parseInt(q[2], 10) - 1) * 3 + 1;
    return `${q[1]}-${String(month).padStart(2, '0')}-01`;
  }

  const s = period.match(/^(\d{4})-S([12])$/);
  if (s) {
    const month = s[2] === '1' ? 1 : 7;
    return `${s[1]}-${String(month).padStart(2, '0')}-01`;
  }

  const w = period.match(/^(\d{4})-W(\d{2})$/);
  if (w) {
    return isoWeekStart(parseInt(w[1], 10), parseInt(w[2], 10));
  }

  throw new Error(`ecbPeriodToDate: unrecognised period code "${period}"`);
}

// ISO 8601 week → Monday of that week, as YYYY-MM-DD.
function isoWeekStart(year: number, week: number): string {
  // Jan 4 is always in week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;  // 1..7 (Mon..Sun)
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Mon);
  target.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
