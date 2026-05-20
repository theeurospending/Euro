// Per-dataset ECB extractors. Each returns an array of ExtractedRow ready for the runner.

import { fetchEcb, type EcbObservation } from '@/lib/extractors/ecb-base';
import type { ExtractedRow } from '@/lib/extractors/eurostat';

export type EcbExtractorOpts = {
  startPeriod?: string;     // ECB period (e.g. "1999-01-01" or "1999-01")
};

const DEFAULT_START = '1999-01-01';

// Series metadata table — defines every ECB series we ingest.
// (dataset, seriesKey, metric_key, country_iso, unit)
const SERIES: Array<{
  dataset: string;
  seriesKey: string;
  metric_key: string;
  country_iso: string;
  unit: string;
}> = [
  // FM — Financial Market data: ECB policy rates (daily)
  { dataset: 'FM', seriesKey: 'D.U2.EUR.4F.KR.MRR_FR.LEV',  metric_key: 'ecb_main_refi_rate',         country_iso: 'EZ', unit: '%' },
  { dataset: 'FM', seriesKey: 'D.U2.EUR.4F.KR.DFR.LEV',     metric_key: 'ecb_deposit_facility_rate',  country_iso: 'EZ', unit: '%' },
  { dataset: 'FM', seriesKey: 'D.U2.EUR.4F.KR.MLFR.LEV',    metric_key: 'ecb_marginal_lending_rate',  country_iso: 'EZ', unit: '%' },

  // IRS — German Bund 10Y benchmark yield (monthly). ECB does not publish a
  // daily Bund-specific series; for daily yields use YC (euro-area aggregate).
  { dataset: 'IRS', seriesKey: 'M.DE.L.L40.CI.0000.EUR.N.Z', metric_key: 'bund_10y_yield',           country_iso: 'DE', unit: '%' },

  // ILM — Eurosystem balance sheet (weekly)
  { dataset: 'ILM', seriesKey: 'W.U2.C.T000000.Z5.Z01',     metric_key: 'ecb_balance_sheet_total',    country_iso: 'EZ', unit: 'EUR millions' },

  // BSI — Monetary aggregates (monthly)
  { dataset: 'BSI', seriesKey: 'M.U2.Y.V.M10.X.1.U2.2300.Z01.E', metric_key: 'm1_eurozone', country_iso: 'EZ', unit: 'EUR millions' },
  { dataset: 'BSI', seriesKey: 'M.U2.Y.V.M20.X.1.U2.2300.Z01.E', metric_key: 'm2_eurozone', country_iso: 'EZ', unit: 'EUR millions' },
  { dataset: 'BSI', seriesKey: 'M.U2.Y.V.M30.X.1.U2.2300.Z01.E', metric_key: 'm3_eurozone', country_iso: 'EZ', unit: 'EUR millions' },

  // EXR — Exchange rates (daily, average)
  { dataset: 'EXR', seriesKey: 'D.USD.EUR.SP00.A',          metric_key: 'eur_usd_rate', country_iso: 'EZ', unit: 'USD per EUR' },
  { dataset: 'EXR', seriesKey: 'D.GBP.EUR.SP00.A',          metric_key: 'eur_gbp_rate', country_iso: 'EZ', unit: 'GBP per EUR' },

  // ICP — HICP (monthly, annual rate of change)
  { dataset: 'ICP', seriesKey: 'M.U2.N.000000.4.ANR',       metric_key: 'eurozone_hicp_headline', country_iso: 'EZ', unit: '%' },
  { dataset: 'ICP', seriesKey: 'M.U2.N.XEF000.4.ANR',       metric_key: 'eurozone_hicp_core',     country_iso: 'EZ', unit: '%' },
];

function obsToExtracted(
  obs: EcbObservation[],
  cfg: typeof SERIES[number],
  source: string,
): ExtractedRow[] {
  return obs.map((o) => ({
    country_iso: cfg.country_iso,
    metric_key: cfg.metric_key,
    period_start: o.period_start,
    value: o.value,
    unit: cfg.unit,
    source,
  }));
}

async function runDatasets(datasets: string[], opts: EcbExtractorOpts): Promise<ExtractedRow[]> {
  const startPeriod = opts.startPeriod ?? DEFAULT_START;
  const subset = SERIES.filter((s) => datasets.includes(s.dataset));
  const out: ExtractedRow[] = [];
  for (const cfg of subset) {
    const obs = await fetchEcb(cfg.dataset, cfg.seriesKey, { startPeriod });
    out.push(...obsToExtracted(obs, cfg, `ecb:${cfg.dataset}`));
  }
  return out;
}

// ----------------------------------------------------------------------------
// One extractor function per source_name. Datasets may span multiple ECB flows.
// ----------------------------------------------------------------------------
export const ecb_fm_rates_and_yield = (opts: EcbExtractorOpts = {}) => runDatasets(['FM', 'IRS'], opts);
export const ecb_ilm_balance_sheet  = (opts: EcbExtractorOpts = {}) => runDatasets(['ILM'], opts);
export const ecb_bsi_money_supply   = (opts: EcbExtractorOpts = {}) => runDatasets(['BSI'], opts);
export const ecb_exr_fx             = (opts: EcbExtractorOpts = {}) => runDatasets(['EXR'], opts);
export const ecb_icp_hicp           = (opts: EcbExtractorOpts = {}) => runDatasets(['ICP'], opts);

export const ECB_EXTRACTORS = {
  ecb_fm_rates_and_yield,
  ecb_ilm_balance_sheet,
  ecb_bsi_money_supply,
  ecb_exr_fx,
  ecb_icp_hicp,
} as const;

export type EcbExtractorName = keyof typeof ECB_EXTRACTORS;
