// Per-dataset Eurostat extractors. Each is a pure async function:
//   (opts) => Promise<ExtractedRow[]>
// Output rows are ready to be diffed and upserted by the ingest runner.

import { fetchEurostat, parseAnnual, parseEurostat, type EurostatNormalisedRow } from '@/lib/extractors/eurostat-base';

export type ExtractedRow = {
  country_iso: string;
  metric_key: string;
  period_start: string;       // YYYY-MM-DD
  value: number;
  unit: string;
  source: string;             // 'eurostat:<dataset>'
  is_estimate?: boolean;
  is_forecast?: boolean;
  notes?: string;
  source_revision_date?: string;
};

export type ExtractorOpts = {
  sinceYear?: number;         // default 1999
};

const DEFAULT_SINCE = 1999;

function flagToBooleans(flag: string | undefined): { is_estimate: boolean; is_forecast: boolean } {
  if (!flag) return { is_estimate: false, is_forecast: false };
  // Eurostat flags: b break, c confidential, d definition differs, e estimated, f forecast,
  //                 n not significant, p provisional, r revised, u low reliability, z not applicable
  return {
    is_estimate: flag.includes('e') || flag.includes('p'),
    is_forecast: flag.includes('f'),
  };
}

function attach(rows: EurostatNormalisedRow[], metricKey: string, unit: string, source: string): ExtractedRow[] {
  return rows.map((r) => {
    const { is_estimate, is_forecast } = flagToBooleans(r.flags);
    return {
      country_iso: r.country_iso,
      metric_key: metricKey,
      period_start: r.period_start,
      value: r.value,
      unit,
      source,
      is_estimate,
      is_forecast,
    };
  });
}

// ----------------------------------------------------------------------------
// gov_10a_main — total expenditure & revenue, % of GDP
// ----------------------------------------------------------------------------
export async function eurostat_gov_10a_main(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const expenditure = await fetchEurostat('gov_10a_main', {
    sector: 'S13', unit: 'PC_GDP', na_item: 'TE', sinceTimePeriod: String(since),
  });
  const revenue = await fetchEurostat('gov_10a_main', {
    sector: 'S13', unit: 'PC_GDP', na_item: 'TR', sinceTimePeriod: String(since),
  });
  return [
    ...attach(parseAnnual(expenditure), 'gov_expenditure_total_pct_gdp', '% of GDP', 'eurostat:gov_10a_main'),
    ...attach(parseAnnual(revenue),     'gov_revenue_total_pct_gdp',     '% of GDP', 'eurostat:gov_10a_main'),
  ];
}

// ----------------------------------------------------------------------------
// gov_10dd_edpt1 — EDP deficit & debt
// ----------------------------------------------------------------------------
export async function eurostat_gov_10dd_edpt1(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;

  // Deficit (B.9), % GDP
  const deficit = await fetchEurostat('gov_10dd_edpt1', {
    sector: 'S13',
    na_item: 'B9',
    unit: 'PC_GDP',
    sinceTimePeriod: String(since),
  });
  // Debt (GD), % GDP
  const debtPct = await fetchEurostat('gov_10dd_edpt1', {
    sector: 'S13',
    na_item: 'GD',
    unit: 'PC_GDP',
    sinceTimePeriod: String(since),
  });
  // Debt (GD), EUR millions
  const debtAbs = await fetchEurostat('gov_10dd_edpt1', {
    sector: 'S13',
    na_item: 'GD',
    unit: 'MIO_EUR',
    sinceTimePeriod: String(since),
  });

  return [
    ...attach(parseAnnual(deficit), 'gov_deficit_pct_gdp',     '% of GDP',     'eurostat:gov_10dd_edpt1'),
    ...attach(parseAnnual(debtPct), 'gov_debt_pct_gdp',        '% of GDP',     'eurostat:gov_10dd_edpt1'),
    ...attach(parseAnnual(debtAbs), 'gov_debt_eur_millions',   'EUR millions', 'eurostat:gov_10dd_edpt1'),
  ];
}

// ----------------------------------------------------------------------------
// gov_10a_exp — COFOG breakdown
// ----------------------------------------------------------------------------
const COFOG_MAP: Record<string, string> = {
  GF02: 'gov_expenditure_defence_pct_gdp',
  GF07: 'gov_expenditure_health_pct_gdp',
  GF09: 'gov_expenditure_education_pct_gdp',
  GF10: 'gov_expenditure_social_protection_pct_gdp',
};

export async function eurostat_gov_10a_exp_cofog(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const out: ExtractedRow[] = [];
  for (const [cofog, metricKey] of Object.entries(COFOG_MAP)) {
    const ds = await fetchEurostat('gov_10a_exp', {
      sector: 'S13',
      na_item: 'TE',
      unit: 'PC_GDP',
      cofog99: cofog,
      sinceTimePeriod: String(since),
    });
    out.push(...attach(parseAnnual(ds), metricKey, '% of GDP', 'eurostat:gov_10a_exp'));
  }
  return out;
}

// ----------------------------------------------------------------------------
// nama_10_gdp — nominal GDP + real growth
// ----------------------------------------------------------------------------
export async function eurostat_nama_10_gdp(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;

  // Nominal GDP, current prices, EUR millions
  const nominal = await fetchEurostat('nama_10_gdp', {
    na_item: 'B1GQ',
    unit: 'CP_MEUR',
    sinceTimePeriod: String(since),
  });
  // Real growth, chain-linked volume, % change on previous period
  const growth = await fetchEurostat('nama_10_gdp', {
    na_item: 'B1GQ',
    unit: 'CLV_PCH_PRE',
    sinceTimePeriod: String(since),
  });

  return [
    ...attach(parseAnnual(nominal), 'gdp_nominal_eur_millions', 'EUR millions', 'eurostat:nama_10_gdp'),
    ...attach(parseAnnual(growth),  'gdp_real_growth_pct',      '%',            'eurostat:nama_10_gdp'),
  ];
}

// ----------------------------------------------------------------------------
// nama_10_pc — GDP per capita, EUR
// ----------------------------------------------------------------------------
export async function eurostat_nama_10_pc(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('nama_10_pc', {
    na_item: 'B1GQ',
    unit: 'CP_EUR_HAB',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'gdp_per_capita_eur', 'EUR per capita', 'eurostat:nama_10_pc');
}

// ----------------------------------------------------------------------------
// prc_hicp_aind — HICP all-items, annual % change
// ----------------------------------------------------------------------------
export async function eurostat_prc_hicp_aind(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('prc_hicp_aind', {
    coicop: 'CP00',
    unit: 'RCH_A_AVG',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'hicp_annual_pct', '%', 'eurostat:prc_hicp_aind');
}

// ----------------------------------------------------------------------------
// une_rt_a — unemployment rate, annual, total, 15-74, % of active
// ----------------------------------------------------------------------------
export async function eurostat_une_rt_a(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('une_rt_a', {
    sex: 'T',
    age: 'Y15-74',
    unit: 'PC_ACT',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'unemployment_rate_pct', '%', 'eurostat:une_rt_a');
}

// ----------------------------------------------------------------------------
// demo_pjan — population on 1 January, total
// ----------------------------------------------------------------------------
export async function eurostat_demo_pjan(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('demo_pjan', {
    sex: 'T',
    age: 'TOTAL',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'population_total', 'persons', 'eurostat:demo_pjan');
}

// ----------------------------------------------------------------------------
// prc_hicp_aind — CORE variant: HICP excl. food + energy (XEF000)
// ----------------------------------------------------------------------------
export async function eurostat_prc_hicp_aind_core(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('prc_hicp_aind', {
    coicop: 'XEF000',
    unit: 'RCH_A_AVG',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'hicp_core_annual_pct', '%', 'eurostat:prc_hicp_aind');
}

// ----------------------------------------------------------------------------
// ilc_lvho07a — Housing cost overburden rate
// % of population in households where housing costs > 40% of disposable income
// ----------------------------------------------------------------------------
export async function eurostat_ilc_lvho07a(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('ilc_lvho07a', {
    incgrp: 'TOTAL',
    hhtyp: 'TOTAL',
    unit: 'PC',
    sinceTimePeriod: String(since),
  });
  return attach(parseAnnual(ds), 'housing_cost_overburden_pct', '%', 'eurostat:ilc_lvho07a');
}

// ----------------------------------------------------------------------------
// namq_10_gdp — quarterly real GDP growth, % change on previous quarter (SCA)
// ----------------------------------------------------------------------------
export async function eurostat_namq_10_gdp(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('namq_10_gdp', {
    na_item: 'B1GQ',
    unit: 'CLV_PCH_PRE',
    s_adj: 'SCA',
    sinceTimePeriod: `${since}-Q1`,
  });
  return attach(parseEurostat(ds, 'quarterly'), 'gdp_real_growth_qoq_pct', '%', 'eurostat:namq_10_gdp');
}

// ----------------------------------------------------------------------------
// prc_hicp_manr — monthly HICP annual rate of change
// ----------------------------------------------------------------------------
export async function eurostat_prc_hicp_manr(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('prc_hicp_manr', {
    coicop: 'CP00',
    unit: 'RCH_A',
    sinceTimePeriod: `${since}-01`,
  });
  return attach(parseEurostat(ds, 'monthly'), 'hicp_monthly_pct', '%', 'eurostat:prc_hicp_manr');
}

// ----------------------------------------------------------------------------
// une_rt_m — monthly unemployment rate (seasonally adjusted)
// ----------------------------------------------------------------------------
export async function eurostat_une_rt_m(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const ds = await fetchEurostat('une_rt_m', {
    sex: 'T',
    age: 'Y15-74',
    unit: 'PC_ACT',
    s_adj: 'SA',
    sinceTimePeriod: `${since}-01`,
  });
  return attach(parseEurostat(ds, 'monthly'), 'unemployment_monthly_pct', '%', 'eurostat:une_rt_m');
}

// ----------------------------------------------------------------------------
// demo_gind — population change components (crude rates, per 1,000 population)
//   CNMIGRATRT — net migration plus statistical adjustment
//   GROWRT     — total population change
// ----------------------------------------------------------------------------
export async function eurostat_demo_gind(opts: ExtractorOpts = {}): Promise<ExtractedRow[]> {
  const since = opts.sinceYear ?? DEFAULT_SINCE;
  const netMig = await fetchEurostat('demo_gind', {
    indic_de: 'CNMIGRATRT',
    sinceTimePeriod: String(since),
  });
  const popChange = await fetchEurostat('demo_gind', {
    indic_de: 'GROWRT',
    sinceTimePeriod: String(since),
  });
  return [
    ...attach(parseAnnual(netMig),    'net_migration_rate',     'per 1,000', 'eurostat:demo_gind'),
    ...attach(parseAnnual(popChange), 'population_change_rate', 'per 1,000', 'eurostat:demo_gind'),
  ];
}

// Registry — looked up by `data_sources.extractor_name`.
export const EUROSTAT_EXTRACTORS = {
  eurostat_demo_gind,
  eurostat_gov_10a_main,
  eurostat_gov_10dd_edpt1,
  eurostat_gov_10a_exp_cofog,
  eurostat_nama_10_gdp,
  eurostat_nama_10_pc,
  eurostat_prc_hicp_aind,
  eurostat_une_rt_a,
  eurostat_demo_pjan,
  eurostat_prc_hicp_manr,
  eurostat_une_rt_m,
  eurostat_namq_10_gdp,
  eurostat_prc_hicp_aind_core,
  eurostat_ilc_lvho07a,
} as const;

export type EurostatExtractorName = keyof typeof EUROSTAT_EXTRACTORS;
