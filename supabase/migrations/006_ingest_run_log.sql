-- 006_ingest_run_log.sql

create table if not exists public.ingest_run_log (
  id bigserial primary key,
  source_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_added int not null default 0,
  rows_updated int not null default 0,
  rows_unchanged int not null default 0,
  rows_rejected int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  triggered_by text not null default 'manual'  -- 'cron' | 'admin' | 'manual'
);

create index if not exists ingest_log_source_idx on public.ingest_run_log (source_name, started_at desc);
create index if not exists ingest_log_recent_idx on public.ingest_run_log (started_at desc);

alter table public.ingest_run_log enable row level security;
-- No public read.
