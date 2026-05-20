-- 018_seo_overrides.sql
-- Per-path SEO override (title, description, og_image_url). Surfaces via
-- generateMetadata() helpers and falls back to defaults when no row exists.

create table if not exists public.seo_overrides (
  path text primary key,                       -- e.g. '/', '/country/germany', '/euro'
  title text,
  description text,
  og_image_url text,
  json_ld_extra jsonb,                         -- merged into the page's existing JSON-LD
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.seo_overrides enable row level security;
grant select on public.seo_overrides to anon, authenticated;
grant all on public.seo_overrides to service_role;

notify pgrst, 'reload schema';
