-- 017_social_media_posts.sql
-- Post history — one row per Make.com webhook dispatch.

create table if not exists public.social_media_posts (
  id bigserial primary key,
  draft_id bigint references public.social_media_drafts(id) on delete set null,
  country_iso text,
  caption text not null,
  image_url text,
  platforms text[] not null default '{}',
  posted_at timestamptz not null default now(),
  platform_statuses jsonb not null default '{}'::jsonb,   -- e.g. {"instagram":"ok","x":"ok"}
  make_response jsonb,                                     -- raw Make.com response payload
  error_message text
);

create index if not exists smp_posted_idx       on public.social_media_posts (posted_at desc);
create index if not exists smp_draft_idx        on public.social_media_posts (draft_id);

alter table public.social_media_posts enable row level security;
grant select on public.social_media_posts to authenticated;
grant all on public.social_media_posts to service_role;
grant usage, select on sequence social_media_posts_id_seq to service_role;

-- Seed default social settings (if not already set by migration 008).
insert into public.admin_settings (key, value, description) values
  ('social.cron_enabled',          'true'::jsonb,                              'Master enable for publish cron'),
  ('social.default_platforms',     '["instagram","x"]'::jsonb,                 'Default platforms for new drafts'),
  ('social.make_webhook_url',      '""'::jsonb,                                'Make.com webhook (empty = posts will fail)'),
  ('social.weekly_draft_cap',      '20'::jsonb,                                'Max drafts auto-generated per detect-now run')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
