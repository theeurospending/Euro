-- 020_more_metrics.sql
-- Higher-frequency variants + non-EZ sovereign yields.

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('hicp_monthly_pct',
     'HICP (monthly)',
     '%',
     'monetary',
     'monthly',
     '{eurostat}',
     'HICP all-items, monthly annual rate of change (Eurostat prc_hicp_manr)',
     51),

  ('unemployment_monthly_pct',
     'Unemployment (monthly)',
     '%',
     'macro',
     'monthly',
     '{eurostat}',
     'Unemployment rate, monthly, total, ages 15-74, % of active population',
     61),

  ('sovereign_10y_yield_local',
     '10Y sovereign yield (local currency)',
     '%',
     'monetary',
     'monthly',
     '{ecb}',
     '10-year benchmark government bond yield for non-eurozone EU members in local currency',
     152)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('eurostat:prc_hicp_manr',
     'eurostat_prc_hicp_manr',
     'eurostat',
     'HICP all-items, monthly annual rate of change (Eurostat)',
     'monthly',
     '{hicp_monthly_pct}',
     '{"dataset":"prc_hicp_manr"}'::jsonb),

  ('eurostat:une_rt_m',
     'eurostat_une_rt_m',
     'eurostat',
     'Unemployment rate, monthly, total, ages 15-74 (Eurostat)',
     'monthly',
     '{unemployment_monthly_pct}',
     '{"dataset":"une_rt_m"}'::jsonb),

  ('ecb:irs_non_ez_yields',
     'ecb_irs_non_ez_yields',
     'ecb',
     '10Y sovereign yields for non-EZ EU members (PL, CZ, HU, RO, SE, DK) in local currency',
     'monthly',
     '{sovereign_10y_yield_local}',
     '{"dataset":"IRS","countries":"non_ez_eu"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
