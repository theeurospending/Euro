-- 014_blog_articles.sql
-- Blog articles with status (draft / scheduled / published) and Tiptap HTML body.

create table if not exists public.blog_articles (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  excerpt text,
  body_html text not null default '',
  cover_image_url text,
  tags text[] not null default '{}',
  status text not null default 'draft',           -- draft | scheduled | published
  scheduled_at timestamptz,                       -- null unless status='scheduled'
  published_at timestamptz,                       -- set when status -> published
  author_id uuid references public.users(id),
  seo_meta jsonb not null default '{}'::jsonb,    -- {og_title, og_description, og_image, ...}
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_articles_status_idx          on public.blog_articles (status);
create index if not exists blog_articles_published_at_idx    on public.blog_articles (published_at desc) where status = 'published';
create index if not exists blog_articles_scheduled_at_idx    on public.blog_articles (scheduled_at)      where status = 'scheduled';
create index if not exists blog_articles_tags_gin_idx        on public.blog_articles using gin (tags);

alter table public.blog_articles enable row level security;

-- Public can read only published posts (or scheduled where scheduled_at <= now() — handled in app code).
drop policy if exists "blog public read published" on public.blog_articles;
create policy "blog public read published" on public.blog_articles
  for select using (status = 'published');

grant select on public.blog_articles to anon, authenticated;
grant all on public.blog_articles to service_role;
grant usage, select on sequence blog_articles_id_seq to service_role;

notify pgrst, 'reload schema';
