-- 013_country_narratives.sql
-- Editorial narrative HTML for each country, edited via Tiptap admin UI.

create table if not exists public.country_narratives (
  country_iso text primary key references public.countries(iso_code) on delete cascade,
  intro_html text not null default '',
  fiscal_context_html text not null default '',
  macro_context_html text not null default '',
  current_situation_html text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

alter table public.country_narratives enable row level security;

drop policy if exists "country_narratives public read" on public.country_narratives;
create policy "country_narratives public read" on public.country_narratives for select using (true);

grant select on public.country_narratives to anon, authenticated;
grant all on public.country_narratives to service_role;

notify pgrst, 'reload schema';
