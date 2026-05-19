-- 007_ai_usage_log.sql
-- Track every Anthropic call from day one.

create table if not exists public.ai_usage_log (
  id bigserial primary key,
  feature text not null,                 -- e.g. 'blog_draft', 'social_caption', 'event_description'
  model text not null,                   -- e.g. 'claude-haiku-4-5', 'claude-sonnet-4-6'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_recent_idx on public.ai_usage_log (created_at desc);
create index if not exists ai_usage_feature_idx on public.ai_usage_log (feature, created_at desc);

alter table public.ai_usage_log enable row level security;
-- No public read.
