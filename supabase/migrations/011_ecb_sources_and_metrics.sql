-- 011_ecb_sources_and_metrics.sql
-- Add ECB metrics + register ECB extractors in data_sources.

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('ecb_main_refi_rate',          'ECB main refinancing rate',           '%',              'monetary', 'daily',   '{ecb}', 'Main Refinancing Operations fixed rate (LEV)',                100),
  ('ecb_deposit_facility_rate',   'ECB deposit facility rate',           '%',              'monetary', 'daily',   '{ecb}', 'Deposit Facility Rate (DFR)',                                 101),
  ('ecb_marginal_lending_rate',   'ECB marginal lending rate',           '%',              'monetary', 'daily',   '{ecb}', 'Marginal Lending Facility Rate (MLFR)',                       102),
  ('ecb_balance_sheet_total',     'Eurosystem balance sheet (total)',    'EUR millions',   'monetary', 'weekly',  '{ecb}', 'Total assets of the Eurosystem consolidated balance sheet',   110),
  ('m1_eurozone',                 'M1 (eurozone)',                       'EUR millions',   'monetary', 'monthly', '{ecb}', 'Narrow money: currency + overnight deposits (eurozone)',      120),
  ('m2_eurozone',                 'M2 (eurozone)',                       'EUR millions',   'monetary', 'monthly', '{ecb}', 'Intermediate money: M1 + deposits up to 2y + redeemable 3m',  121),
  ('m3_eurozone',                 'M3 (eurozone)',                       'EUR millions',   'monetary', 'monthly', '{ecb}', 'Broad money: M2 + repos + MMF shares + debt up to 2y',         122),
  ('eur_usd_rate',                'EUR / USD',                           'USD per EUR',    'monetary', 'daily',   '{ecb}', 'ECB reference exchange rate, USD per EUR (SP00.A)',           130),
  ('eur_gbp_rate',                'EUR / GBP',                           'GBP per EUR',    'monetary', 'daily',   '{ecb}', 'ECB reference exchange rate, GBP per EUR (SP00.A)',           131),
  ('eurozone_hicp_headline',      'Eurozone HICP (headline)',            '%',              'monetary', 'monthly', '{ecb}', 'HICP all-items annual rate of change',                        140),
  ('eurozone_hicp_core',          'Eurozone HICP (core, ex food+energy)','%',              'monetary', 'monthly', '{ecb}', 'HICP excluding energy, food, alcohol and tobacco — annual',  141),
  ('bund_10y_yield',              'German Bund 10-year yield',           '%',              'monetary', 'daily',   '{ecb}', 'Germany 10-year benchmark government bond yield',             150)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('ecb:fm_rates_and_yield', 'ecb_fm_rates_and_yield', 'ecb', 'ECB policy rates (main refi, deposit facility, marginal lending) + German 10Y Bund yield', 'daily',
     '{ecb_main_refi_rate,ecb_deposit_facility_rate,ecb_marginal_lending_rate,bund_10y_yield}',
     '{"dataset":"FM"}'::jsonb),
  ('ecb:ilm_balance_sheet',  'ecb_ilm_balance_sheet',  'ecb', 'Eurosystem consolidated balance sheet — total assets (weekly)',                          'weekly',
     '{ecb_balance_sheet_total}',
     '{"dataset":"ILM"}'::jsonb),
  ('ecb:bsi_money_supply',   'ecb_bsi_money_supply',   'ecb', 'M1, M2, M3 monetary aggregates (eurozone, monthly)',                                     'monthly',
     '{m1_eurozone,m2_eurozone,m3_eurozone}',
     '{"dataset":"BSI"}'::jsonb),
  ('ecb:exr_fx',             'ecb_exr_fx',             'ecb', 'EUR/USD and EUR/GBP reference exchange rates (daily)',                                    'daily',
     '{eur_usd_rate,eur_gbp_rate}',
     '{"dataset":"EXR"}'::jsonb),
  ('ecb:icp_hicp',           'ecb_icp_hicp',           'ecb', 'Eurozone HICP headline + core (annual rate of change, monthly)',                          'monthly',
     '{eurozone_hicp_headline,eurozone_hicp_core}',
     '{"dataset":"ICP"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
