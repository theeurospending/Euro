// IMF World Economic Outlook (WEO) forecast extractor.
//
// API: https://www.imf.org/external/datamapper/api/v1/<indicator>/<iso3>?periods=...
// Returns: { values: { <indicator>: { <iso3>: { <year>: value } } } }
// Year coverage: ~1980 → ~2031 (mix of historical + forecast).

import type { ExtractedRow } from '@/lib/extractors/eurostat';

const IMF_ROOT = 'https://www.imf.org/external/datamapper/api/v1';

// ISO-3 → our internal ISO-2 country code.
const ISO3_TO_OUR: Record<string, string> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK',
  EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL', POL: 'PL',
  PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
  GBR: 'GB', USA: 'US', CHE: 'CH', NOR: 'NO',
  // Major non-EU economies for the region comparison.
  CHN: 'CN', IND: 'IN', JPN: 'JP',
  // Eurozone aggregate (IMF uses EUR or sometimes EA)
  EUR: 'EZ', EA:  'EZ',
};

const WEO_INDICATORS: Array<{ code: string; metric_key: string; unit: string }> = [
  { code: 'NGDP_RPCH',    metric_key: 'imf_gdp_growth_forecast_pct',      unit: '%' },
  { code: 'GGXWDG_NGDP',  metric_key: 'imf_gross_debt_forecast_pct_gdp',  unit: '% of GDP' },
  { code: 'GGXCNL_NGDP',  metric_key: 'imf_net_lending_forecast_pct_gdp', unit: '% of GDP' },
  { code: 'PCPIPCH',      metric_key: 'imf_inflation_forecast_pct',       unit: '%' },
];

type ImfResponse = {
  values: Record<string, Record<string, Record<string, number | null>>>;
};

export type ImfExtractorOpts = {
  sinceYear?: number;     // default 1999
};

export async function imf_weo_forecasts(opts: ImfExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? 1999;
  const out: ExtractedRow[] = [];

  for (const indicator of WEO_INDICATORS) {
    const url = `${IMF_ROOT}/${indicator.code}`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        // IMF datamapper CDN 403s requests without a UA header.
        'user-agent': 'eurospending.org/1.0 (+https://eurospending.org)',
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      throw new Error(`IMF ${indicator.code} HTTP ${res.status}`);
    }
    const json = (await res.json()) as ImfResponse;
    const byCountry = json.values?.[indicator.code];
    if (!byCountry) {
      throw new Error(`IMF ${indicator.code}: unexpected response shape`);
    }

    for (const [iso3, years] of Object.entries(byCountry)) {
      const internalIso = ISO3_TO_OUR[iso3];
      if (!internalIso) continue;
      for (const [yearStr, value] of Object.entries(years)) {
        const year = parseInt(yearStr, 10);
        if (!Number.isFinite(year) || year < since) continue;
        if (value == null || !Number.isFinite(value)) continue;
        // Mark future years as forecast.
        const currentYear = new Date().getUTCFullYear();
        const isForecast = year >= currentYear;
        out.push({
          country_iso: internalIso,
          metric_key: indicator.metric_key,
          period_start: `${year}-01-01`,
          value,
          unit: indicator.unit,
          source: 'imf:WEO',
          is_forecast: isForecast,
        });
      }
    }
  }

  return out;
}

export const IMF_EXTRACTORS = {
  imf_weo_forecasts,
} as const;

export type ImfExtractorName = keyof typeof IMF_EXTRACTORS;
