-- 009_data_sources.sql
-- One row per logical source/extractor. Updated by the runner after each run.

create table if not exists public.data_sources (
  source_name text primary key,                   -- e.g. 'eurostat:gov_10a_main'
  extractor_name text not null,                   -- function key used by the runner
  category text not null,                         -- 'eurostat' | 'ecb' | 'oecd' | 'imf'
  description text,
  frequency text not null,                        -- 'annual'|'quarterly'|'monthly'|'weekly'|'daily'
  metric_keys text[] not null default '{}',       -- metrics this source feeds
  enabled boolean not null default true,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  last_run_status text,                           -- 'ok' | 'error' | 'partial'
  last_run_summary jsonb,                         -- {added,updated,unchanged,rejected,errors:[...]}
  consecutive_failures int not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_sources_category_idx on public.data_sources (category);
create index if not exists data_sources_enabled_idx on public.data_sources (enabled) where enabled = true;

alter table public.data_sources enable row level security;

-- ============================================================
-- Seed: Eurostat sources (8 datasets covering 15 metrics)
-- ============================================================
insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('eurostat:gov_10a_main',     'eurostat_gov_10a_main',     'eurostat', 'Government total expenditure and revenue, % of GDP (S13)',                   'annual',
     '{gov_expenditure_total_pct_gdp,gov_revenue_total_pct_gdp}',          '{"dataset":"gov_10a_main"}'::jsonb),
  ('eurostat:gov_10dd_edpt1',   'eurostat_gov_10dd_edpt1',   'eurostat', 'Government deficit and debt — EDP table 1',                                  'annual',
     '{gov_deficit_pct_gdp,gov_debt_pct_gdp,gov_debt_eur_millions}',       '{"dataset":"gov_10dd_edpt1"}'::jsonb),
  ('eurostat:gov_10a_exp_cofog','eurostat_gov_10a_exp_cofog','eurostat', 'Government expenditure by COFOG function, % of GDP',                         'annual',
     '{gov_expenditure_health_pct_gdp,gov_expenditure_education_pct_gdp,gov_expenditure_defence_pct_gdp,gov_expenditure_social_protection_pct_gdp}',
     '{"dataset":"gov_10a_exp"}'::jsonb),
  ('eurostat:nama_10_gdp',      'eurostat_nama_10_gdp',      'eurostat', 'GDP nominal (current EUR millions) and real growth (% YoY)',                 'annual',
     '{gdp_nominal_eur_millions,gdp_real_growth_pct}',                     '{"dataset":"nama_10_gdp"}'::jsonb),
  ('eurostat:nama_10_pc',       'eurostat_nama_10_pc',       'eurostat', 'GDP per capita, current EUR per inhabitant',                                 'annual',
     '{gdp_per_capita_eur}',                                               '{"dataset":"nama_10_pc"}'::jsonb),
  ('eurostat:prc_hicp_aind',    'eurostat_prc_hicp_aind',    'eurostat', 'HICP all-items, annual average rate of change',                              'annual',
     '{hicp_annual_pct}',                                                  '{"dataset":"prc_hicp_aind"}'::jsonb),
  ('eurostat:une_rt_a',         'eurostat_une_rt_a',         'eurostat', 'Unemployment rate, annual, total, ages 15-74, % of active population',       'annual',
     '{unemployment_rate_pct}',                                            '{"dataset":"une_rt_a"}'::jsonb),
  ('eurostat:demo_pjan',        'eurostat_demo_pjan',        'eurostat', 'Population on 1 January, total',                                             'annual',
     '{population_total}',                                                 '{"dataset":"demo_pjan"}'::jsonb)
on conflict (source_name) do nothing;

-- ============================================================
-- Seed: metrics referenced above
-- ============================================================
insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('gov_expenditure_total_pct_gdp',            'Government expenditure (total)', '% of GDP',         'fiscal_spending',  'annual', '{eurostat}', 'Total general government expenditure, S13, % of GDP',                   10),
  ('gov_revenue_total_pct_gdp',                'Government revenue (total)',     '% of GDP',         'fiscal_revenue',   'annual', '{eurostat}', 'Total general government revenue, S13, % of GDP',                       11),
  ('gov_deficit_pct_gdp',                      'Deficit / surplus (B.9)',        '% of GDP',         'fiscal_balance',   'annual', '{eurostat}', 'Net lending (+) / net borrowing (-) of general government, % of GDP',   20),
  ('gov_debt_pct_gdp',                         'Government debt',                '% of GDP',         'fiscal_balance',   'annual', '{eurostat}', 'General government consolidated gross debt, Maastricht, % of GDP',     21),
  ('gov_debt_eur_millions',                    'Government debt (absolute)',     'EUR millions',     'fiscal_balance',   'annual', '{eurostat}', 'General government consolidated gross debt, Maastricht, EUR millions', 22),
  ('gov_expenditure_health_pct_gdp',           'Spending — health',              '% of GDP',         'fiscal_spending',  'annual', '{eurostat}', 'COFOG GF07 health expenditure, % of GDP',                               30),
  ('gov_expenditure_education_pct_gdp',        'Spending — education',           '% of GDP',         'fiscal_spending',  'annual', '{eurostat}', 'COFOG GF09 education expenditure, % of GDP',                            31),
  ('gov_expenditure_defence_pct_gdp',          'Spending — defence',             '% of GDP',         'fiscal_spending',  'annual', '{eurostat}', 'COFOG GF02 defence expenditure, % of GDP',                              32),
  ('gov_expenditure_social_protection_pct_gdp','Spending — social protection',   '% of GDP',         'fiscal_spending',  'annual', '{eurostat}', 'COFOG GF10 social protection expenditure, % of GDP',                    33),
  ('gdp_nominal_eur_millions',                 'GDP (nominal)',                  'EUR millions',     'macro',            'annual', '{eurostat}', 'GDP at market prices, current prices, EUR millions',                    40),
  ('gdp_real_growth_pct',                      'GDP real growth (YoY)',          '%',                'macro',            'annual', '{eurostat}', 'Real GDP growth, chain-linked volume, % change on previous year',      41),
  ('gdp_per_capita_eur',                       'GDP per capita',                 'EUR per capita',   'macro',            'annual', '{eurostat}', 'GDP per capita at current market prices, EUR per inhabitant',           42),
  ('hicp_annual_pct',                          'HICP (annual)',                  '%',                'monetary',         'annual', '{eurostat}', 'Harmonised Index of Consumer Prices, annual average rate of change',    50),
  ('unemployment_rate_pct',                    'Unemployment rate',              '%',                'macro',            'annual', '{eurostat}', 'Unemployment rate, % of active population aged 15-74',                  60),
  ('population_total',                         'Population',                     'persons',          'structural',       'annual', '{eurostat}', 'Total population on 1 January',                                         70)
on conflict (key) do update set
  display_name = excluded.display_name,
  unit = excluded.unit,
  category = excluded.category,
  description = excluded.description,
  display_order = excluded.display_order,
  updated_at = now();
