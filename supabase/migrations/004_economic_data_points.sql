-- 004_economic_data_points.sql
-- Compound primary key prevents duplicate rows for the same observation.

create table if not exists public.economic_data_points (
  country_iso text not null references public.countries(iso_code) on delete cascade,
  metric_key text not null references public.metrics(key) on delete cascade,
  period_start date not null,            -- canonical period start (annual: YYYY-01-01; monthly: YYYY-MM-01; daily: that date)
  period_end date,                       -- optional; for ranges
  value numeric not null,
  unit text not null,
  source text not null,                  -- 'eurostat' | 'ecb' | 'imf' | 'oecd' | etc.
  source_revision_date date,
  ingested_at timestamptz not null default now(),
  is_estimate boolean not null default false,
  is_forecast boolean not null default false,
  notes text,
  primary key (country_iso, metric_key, period_start)
);

create index if not exists edp_country_metric_period_desc_idx
  on public.economic_data_points (country_iso, metric_key, period_start desc);

create index if not exists edp_metric_period_value_idx
  on public.economic_data_points (metric_key, period_start, value);

alter table public.economic_data_points enable row level security;

drop policy if exists "edp public read" on public.economic_data_points;
create policy "edp public read" on public.economic_data_points
  for select using (true);
