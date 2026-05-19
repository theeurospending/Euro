-- 005_data_revisions.sql
-- Append-only audit log: every time an existing data point changes value or source.

create table if not exists public.data_revisions (
  id bigserial primary key,
  country_iso text not null,
  metric_key text not null,
  period_start date not null,
  old_value numeric,
  new_value numeric,
  old_source text,
  new_source text,
  revision_detected_at timestamptz not null default now(),
  ingest_run_id bigint
);

create index if not exists data_revisions_lookup_idx
  on public.data_revisions (country_iso, metric_key, period_start);

create index if not exists data_revisions_recent_idx
  on public.data_revisions (revision_detected_at desc);

alter table public.data_revisions enable row level security;
-- No public read; admin reads via service role.
