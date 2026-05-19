-- 003_metrics.sql

create table if not exists public.metrics (
  key text primary key,
  display_name text not null,
  unit text not null,                 -- e.g. '% of GDP', 'EUR millions', '%', 'index', 'rate'
  category text not null,             -- fiscal_spending | fiscal_revenue | fiscal_balance | macro | monetary | structural
  frequency text not null,            -- annual | quarterly | monthly | weekly | daily
  source_priority text[] not null default '{}',  -- e.g. ['eurostat','oecd','imf']
  description text,
  methodology_url text,
  display_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metrics_category_idx on public.metrics (category);
create index if not exists metrics_active_idx on public.metrics (is_active) where is_active = true;

alter table public.metrics enable row level security;

drop policy if exists "metrics public read" on public.metrics;
create policy "metrics public read" on public.metrics
  for select using (is_active = true);
