// Typed client for the Eurostat dissemination API + JSON-stat 2.0 parser.
//
// API root: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}
// Format: ?format=JSON returns JSON-stat 2.0.
// Filter syntax: repeated query params, e.g. ?geo=DE&geo=FR&unit=PC_GDP&time=2020
// Or open-ended: ?sinceTimePeriod=1999
//
// JSON-stat 2.0 spec: https://json-stat.org/format/

export type EurostatNormalisedRow = {
  country_iso: string;       // our internal ISO (with EZ/EU aggregates remapped)
  eurostat_geo: string;      // original Eurostat geo code (e.g. EA20, EU27_2020, DE)
  period_start: string;      // ISO date YYYY-MM-DD (annual → YYYY-01-01)
  period_label: string;      // raw label e.g. "2020"
  value: number;
  flags?: string;            // status flag from Eurostat (e:estimate, p:provisional, etc.)
};

export type JsonStatDataset = {
  version?: string;
  class?: string;
  label?: string;
  source?: string;
  updated?: string;
  id: string[];                     // dimension order
  size: number[];                   // dimension sizes (same order as id)
  value: Record<string, number> | (number | null)[];
  status?: Record<string, string> | string[];
  dimension: Record<string, {
    label?: string;
    category: {
      index: Record<string, number> | string[];
      label?: Record<string, string>;
    };
  }>;
};

const EUROSTAT_ROOT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

// Eurostat geo code → our internal iso_code mapping.
// We accept ISO-2 plus Eurostat's special aggregates.
// PRECEDENCE: for aggregates like EZ (eurozone) and EU, Eurostat may emit
// multiple variants (EA19 + EA20, EU27_2020 + EU28) for the same year. We
// keep ALL mappings in the table but dedupe by precedence — higher number wins.
const GEO_TO_ISO: Record<string, string> = {
  EA20: 'EZ',
  EA19: 'EZ',
  EA18: 'EZ',
  EA17: 'EZ',
  EA12: 'EZ',
  EU27_2020: 'EU',
  EU28: 'EU',
  EU27: 'EU',
  EU15: 'EU',
  UK: 'GB',          // Eurostat uses UK; ISO standard is GB
  EL: 'GR',          // Eurostat uses EL for Greece
};

// Higher = more preferred when multiple Eurostat aggregate codes map to the same iso.
const GEO_PRECEDENCE: Record<string, number> = {
  EA20: 100, EA19: 90, EA18: 80, EA17: 70, EA12: 60,
  EU27_2020: 100, EU28: 90, EU27: 80, EU15: 70,
};

export function eurostatGeoToIso(eurostatGeo: string): string {
  return GEO_TO_ISO[eurostatGeo] ?? eurostatGeo;
}

function geoPrecedence(eurostatGeo: string): number {
  return GEO_PRECEDENCE[eurostatGeo] ?? 1000;  // ISO-2 country codes always win over aggregates
}

const KNOWN_ISO_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'EZ', 'EU', 'GB', 'US', 'CH', 'NO',
]);

export function isKnownCountry(iso: string): boolean {
  return KNOWN_ISO_CODES.has(iso);
}

/**
 * Build a Eurostat data URL with repeated query-param filter encoding.
 */
export function buildEurostatUrl(
  dataset: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const url = new URL(`${EUROSTAT_ROOT}/${dataset}`);
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('lang', 'EN');
  for (const [key, val] of Object.entries(params)) {
    if (val == null) continue;
    const values = Array.isArray(val) ? val : [val];
    for (const v of values) url.searchParams.append(key, v);
  }
  return url.toString();
}

/**
 * Fetch + parse a Eurostat JSON-stat 2.0 dataset.
 * Throws on HTTP errors or unrecognised response shape.
 */
export async function fetchEurostat(dataset: string, params: Record<string, string | string[] | undefined>): Promise<JsonStatDataset> {
  const url = buildEurostatUrl(dataset, params);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Eurostat ${dataset} HTTP ${res.status}: ${body.slice(0, 300)} (url=${url})`);
  }
  const json = await res.json() as unknown;
  if (!json || typeof json !== 'object' || !('id' in json) || !('size' in json) || !('dimension' in json) || !('value' in json)) {
    throw new Error(`Eurostat ${dataset}: unexpected response shape (url=${url})`);
  }
  return json as JsonStatDataset;
}

/**
 * Convert a JSON-stat 2.0 dataset into a flat array of normalised rows.
 *
 * For each cell in the multi-dim table, we emit one row containing
 *   { country_iso, period_start, value, flags, eurostat_geo, period_label }
 *
 * Filters out cells with no value, unknown countries, and non-annual time labels.
 */
// Convert a Eurostat time label like "2024M03" / "2024-Q2" / "2024" into a
// canonical period_start YYYY-MM-DD, or null if it's not the requested frequency.
function eurostatTimeLabelToPeriodStart(label: string, frequency: 'annual' | 'monthly' | 'quarterly'): string | null {
  if (frequency === 'annual') {
    return /^\d{4}$/.test(label) ? `${label}-01-01` : null;
  }
  if (frequency === 'monthly') {
    // Eurostat returns monthly labels as "2024-01" (some datasets "2024M01").
    const m = label.match(/^(\d{4})[-M](\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-01`;
    return null;
  }
  if (frequency === 'quarterly') {
    const q = label.match(/^(\d{4})-?Q(\d)$/);
    if (q) {
      const month = String((parseInt(q[2], 10) - 1) * 3 + 1).padStart(2, '0');
      return `${q[1]}-${month}-01`;
    }
    return null;
  }
  return null;
}

export function parseEurostat(ds: JsonStatDataset, frequency: 'annual' | 'monthly' | 'quarterly' = 'annual'): EurostatNormalisedRow[] {
  const dims = ds.id;
  const sizes = ds.size;
  const geoDimIdx = dims.indexOf('geo');
  const timeDimIdx = dims.indexOf('time');
  if (geoDimIdx === -1 || timeDimIdx === -1) {
    throw new Error(`parseEurostat: dataset is missing geo or time dimension (id=${dims.join(',')})`);
  }

  const geoByPos = invertCategoryIndex(ds.dimension.geo.category.index, sizes[geoDimIdx]);
  const timeByPos = invertCategoryIndex(ds.dimension.time.category.index, sizes[timeDimIdx]);
  const strides = computeStrides(sizes);
  const total = sizes.reduce((a, b) => a * b, 1);
  const rows: EurostatNormalisedRow[] = [];
  const valueObj = Array.isArray(ds.value) ? null : ds.value;
  const valueArr = Array.isArray(ds.value) ? ds.value : null;

  for (let flat = 0; flat < total; flat++) {
    const v = valueObj ? valueObj[String(flat)] : valueArr![flat];
    if (v == null || typeof v !== 'number' || !Number.isFinite(v)) continue;

    let rem = flat, geoPos = 0, timePos = 0;
    for (let d = 0; d < dims.length; d++) {
      const pos = Math.floor(rem / strides[d]);
      rem -= pos * strides[d];
      if (d === geoDimIdx) geoPos = pos;
      if (d === timeDimIdx) timePos = pos;
    }

    const eurostatGeo = geoByPos[geoPos];
    const timeLabel = timeByPos[timePos];
    if (!eurostatGeo || !timeLabel) continue;

    const iso = eurostatGeoToIso(eurostatGeo);
    if (!isKnownCountry(iso)) continue;

    const period_start = eurostatTimeLabelToPeriodStart(timeLabel, frequency);
    if (!period_start) continue;

    rows.push({
      country_iso: iso,
      eurostat_geo: eurostatGeo,
      period_start,
      period_label: timeLabel,
      value: v,
      flags: readFlag(ds.status, flat),
    });
  }

  // Dedupe by (iso, period) preferring higher-precedence geo (EA20 > EA19, etc.)
  const seen = new Map<string, EurostatNormalisedRow>();
  for (const r of rows) {
    const key = `${r.country_iso}|${r.period_start}`;
    const existing = seen.get(key);
    if (!existing || geoPrecedence(r.eurostat_geo) > geoPrecedence(existing.eurostat_geo)) {
      seen.set(key, r);
    }
  }
  return [...seen.values()];
}

export function parseAnnual(ds: JsonStatDataset): EurostatNormalisedRow[] {
  const dims = ds.id;
  const sizes = ds.size;
  const geoDimIdx = dims.indexOf('geo');
  const timeDimIdx = dims.indexOf('time');
  if (geoDimIdx === -1 || timeDimIdx === -1) {
    throw new Error(`parseAnnual: dataset is missing geo or time dimension (id=${dims.join(',')})`);
  }

  // Build inverse indices: position → key for geo and time dimensions.
  const geoByPos = invertCategoryIndex(ds.dimension.geo.category.index, sizes[geoDimIdx]);
  const timeByPos = invertCategoryIndex(ds.dimension.time.category.index, sizes[timeDimIdx]);

  // Pre-compute row strides (how many cells a step in dimension i covers).
  const strides = computeStrides(sizes);

  // Total cells in the cube.
  const total = sizes.reduce((a, b) => a * b, 1);

  const rows: EurostatNormalisedRow[] = [];

  // Normalise the value container: either an object keyed by stringified index
  // or a sparse-or-dense array indexed by position.
  const valueObj = Array.isArray(ds.value) ? null : ds.value;
  const valueArr = Array.isArray(ds.value) ? ds.value : null;

  for (let flat = 0; flat < total; flat++) {
    const v = valueObj
      ? valueObj[String(flat)]
      : valueArr![flat];
    if (v == null || typeof v !== 'number' || !Number.isFinite(v)) continue;

    // Decompose flat index into per-dimension positions.
    let rem = flat;
    let geoPos = 0;
    let timePos = 0;
    for (let d = 0; d < dims.length; d++) {
      const pos = Math.floor(rem / strides[d]);
      rem -= pos * strides[d];
      if (d === geoDimIdx) geoPos = pos;
      if (d === timeDimIdx) timePos = pos;
    }

    const eurostatGeo = geoByPos[geoPos];
    const timeLabel = timeByPos[timePos];
    if (!eurostatGeo || !timeLabel) continue;

    const iso = eurostatGeoToIso(eurostatGeo);
    if (!isKnownCountry(iso)) continue;

    // Annual: time label like "2024". Reject anything else (monthly "2024M01", quarterly "2024-Q1", etc.).
    if (!/^\d{4}$/.test(timeLabel)) continue;

    rows.push({
      country_iso: iso,
      eurostat_geo: eurostatGeo,
      period_start: `${timeLabel}-01-01`,
      period_label: timeLabel,
      value: v,
      flags: readFlag(ds.status, flat),
    });
  }

  // Dedupe by (iso, period) keeping highest-precedence source code.
  // Country-code rows have precedence 1000; aggregate variants compete with each other.
  const seen = new Map<string, EurostatNormalisedRow>();
  for (const r of rows) {
    const key = `${r.country_iso}|${r.period_start}`;
    const existing = seen.get(key);
    if (!existing || geoPrecedence(r.eurostat_geo) > geoPrecedence(existing.eurostat_geo)) {
      seen.set(key, r);
    }
  }
  return [...seen.values()];
}

function invertCategoryIndex(idx: Record<string, number> | string[], size: number): string[] {
  const out: string[] = new Array(size);
  if (Array.isArray(idx)) {
    for (let i = 0; i < idx.length; i++) out[i] = idx[i];
  } else {
    for (const [key, pos] of Object.entries(idx)) out[pos] = key;
  }
  return out;
}

function computeStrides(sizes: number[]): number[] {
  const strides = new Array(sizes.length);
  let s = 1;
  for (let i = sizes.length - 1; i >= 0; i--) {
    strides[i] = s;
    s *= sizes[i];
  }
  return strides;
}

function readFlag(status: JsonStatDataset['status'], flat: number): string | undefined {
  if (!status) return undefined;
  if (Array.isArray(status)) return status[flat] || undefined;
  return status[String(flat)] || undefined;
}
