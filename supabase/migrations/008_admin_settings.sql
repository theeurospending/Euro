-- 008_admin_settings.sql
-- Generic key-value config table used across the app.

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.admin_settings enable row level security;
-- No public read; admin reads via service role.

-- Common defaults
insert into public.admin_settings (key, value, description) values
  ('social.weekly_draft_cap', '20'::jsonb,             'Max drafts auto-generated per week'),
  ('social.make_webhook_url', '""'::jsonb,             'Make.com webhook for social publishing'),
  ('social.default_platforms', '["instagram","x"]'::jsonb, 'Default platforms for new drafts'),
  ('social.cron_enabled', 'true'::jsonb,               'Master enable for social cron')
on conflict (key) do nothing;
