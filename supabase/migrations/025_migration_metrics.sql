-- 025_migration_metrics.sql
-- Net migration and total population change (Eurostat demo_gind, crude rates
-- per 1,000 population). Powers the homepage migration / net-population-change
-- display. Requires an ingest run for the eurostat:demo_gind source to populate.

insert into public.metrics
  (key, display_name, unit, category, frequency, source_priority, description, display_order)
values
  ('net_migration_rate',     'Net migration rate',      'per 1,000', 'structural', 'annual', '{eurostat}', 'Crude rate of net migration plus statistical adjustment, per 1,000 population (demo_gind, CNMIGRATRT)', 71),
  ('population_change_rate',  'Population change rate',  'per 1,000', 'structural', 'annual', '{eurostat}', 'Crude rate of total population change, per 1,000 population (demo_gind, GROWRT)',                       72)
on conflict (key) do update set
  display_name     = excluded.display_name,
  unit             = excluded.unit,
  category         = excluded.category,
  frequency        = excluded.frequency,
  source_priority  = excluded.source_priority,
  description      = excluded.description,
  display_order    = excluded.display_order,
  is_active        = true,
  updated_at       = now();

insert into public.data_sources
  (source_name, extractor_name, category, description, frequency, metric_keys, config)
values
  ('eurostat:demo_gind', 'eurostat_demo_gind', 'eurostat', 'Population change components — net migration and total change (crude rates per 1,000)', 'annual',
     '{net_migration_rate,population_change_rate}', '{"dataset":"demo_gind"}'::jsonb)
on conflict (source_name) do nothing;

notify pgrst, 'reload schema';
