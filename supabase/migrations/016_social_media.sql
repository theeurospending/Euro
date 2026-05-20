-- 016_social_media.sql
-- Social fact-detection candidates + drafts + Google Drive photo LRU.

create table if not exists public.social_media_candidates (
  id bigserial primary key,
  country_iso text references public.countries(iso_code) on delete cascade,  -- null for eurozone-wide
  rule_name text not null,                                                   -- e.g. 'threshold_crossing'
  headline text not null,                                                    -- single-line summary (may be templated, no AI)
  supporting_data jsonb not null default '{}'::jsonb,                        -- {metric, value, period, prior, threshold, ...}
  priority_score int not null default 0,                                     -- 0..100
  chart_type text not null default 'none',                                   -- 'line'|'bar'|'donut'|'none'
  detected_at timestamptz not null default now(),
  status text not null default 'new',                                        -- 'new'|'promoted'|'dismissed'
  dismissed_reason text
);

create index if not exists smc_status_idx     on public.social_media_candidates (status);
create index if not exists smc_priority_idx   on public.social_media_candidates (priority_score desc);
create index if not exists smc_detected_idx   on public.social_media_candidates (detected_at desc);
create unique index if not exists smc_dedup_idx on public.social_media_candidates (rule_name, country_iso, (supporting_data ->> 'metric'), (supporting_data ->> 'period'));

alter table public.social_media_candidates enable row level security;
grant select on public.social_media_candidates to authenticated;
grant all on public.social_media_candidates to service_role;
grant usage, select on sequence social_media_candidates_id_seq to service_role;

create table if not exists public.social_media_drafts (
  id bigserial primary key,
  candidate_id bigint references public.social_media_candidates(id) on delete set null,
  post_type text not null default 'chart',                          -- 'chart'|'photo_overlay' (photo deferred S13)
  country_iso text references public.countries(iso_code),
  caption text not null,
  image_url text,                                                   -- public Supabase URL
  chart_data jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  status text not null default 'draft',                             -- 'draft'|'scheduled'|'posted'|'failed'
  platforms text[] not null default '{instagram,x}',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists smd_status_idx       on public.social_media_drafts (status);
create index if not exists smd_scheduled_idx    on public.social_media_drafts (scheduled_at) where status = 'scheduled';

alter table public.social_media_drafts enable row level security;
grant select on public.social_media_drafts to authenticated;
grant all on public.social_media_drafts to service_role;
grant usage, select on sequence social_media_drafts_id_seq to service_role;

create table if not exists public.social_photo_usage (
  id bigserial primary key,
  country_iso text not null,
  drive_file_id text not null,
  last_used_at timestamptz,
  use_count int not null default 0,
  unique (country_iso, drive_file_id)
);

alter table public.social_photo_usage enable row level security;
grant all on public.social_photo_usage to service_role;

notify pgrst, 'reload schema';
