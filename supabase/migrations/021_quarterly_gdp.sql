-- 021_quarterly_gdp.sql

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('gdp_real_growth_qoq_pct',
     'GDP real growth (QoQ)',
     '%',
     'macro',
     'quarterly',
     '{eurostat}',
     'Real GDP, chain-linked volume, % change on previous quarter, seasonally adjusted',
     43)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('eurostat:namq_10_gdp',
     'eurostat_namq_10_gdp',
     'eurostat',
     'Quarterly real GDP growth (chain-linked, SCA, % QoQ)',
     'quarterly',
     '{gdp_real_growth_qoq_pct}',
     '{"dataset":"namq_10_gdp"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
