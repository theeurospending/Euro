-- 022_core_inflation_and_housing.sql

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('hicp_core_annual_pct',
     'Core inflation (HICP ex food + energy)',
     '%',
     'monetary',
     'annual',
     '{eurostat}',
     'Eurostat HICP excluding energy, food, alcohol & tobacco (coicop=XEF000) — annual rate of change',
     52),

  ('housing_cost_overburden_pct',
     'Housing cost burden',
     '%',
     'structural',
     'annual',
     '{eurostat}',
     'Share of population whose total housing costs exceed 40% of disposable income (Eurostat ilc_lvho07a)',
     80)
on conflict (key) do update set
  display_name = excluded.display_name, unit = excluded.unit, category = excluded.category,
  description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('eurostat:prc_hicp_aind_core',
     'eurostat_prc_hicp_aind_core',
     'eurostat',
     'Core HICP — annual avg rate of change ex food+energy (XEF000)',
     'annual',
     '{hicp_core_annual_pct}',
     '{"dataset":"prc_hicp_aind","coicop":"XEF000"}'::jsonb),

  ('eurostat:ilc_lvho07a',
     'eurostat_ilc_lvho07a',
     'eurostat',
     'Housing cost overburden rate — % of population with housing costs >40% disposable income',
     'annual',
     '{housing_cost_overburden_pct}',
     '{"dataset":"ilc_lvho07a"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';

select (select count(*) from public.metrics) as metrics, (select count(*) from public.data_sources) as sources;
