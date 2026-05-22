-- 019_newsletter.sql
-- Email subscribers with double opt-in + a log of every digest sent.

create table if not exists public.newsletter_subscribers (
  id bigserial primary key,
  email text not null unique,
  status text not null default 'pending',           -- 'pending' | 'confirmed' | 'unsubscribed'
  confirm_token text,                                -- random, used in confirm link
  unsubscribe_token text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 32),
  source text,                                       -- where they signed up from (e.g. 'homepage')
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  last_emailed_at timestamptz
);

create index if not exists newsletter_status_idx on public.newsletter_subscribers (status);
create index if not exists newsletter_confirm_idx on public.newsletter_subscribers (confirm_token) where confirm_token is not null;

alter table public.newsletter_subscribers enable row level security;
-- No anon read; signups via server-side route with service role.
grant all on public.newsletter_subscribers to service_role;
grant usage, select on sequence newsletter_subscribers_id_seq to service_role;

create table if not exists public.newsletter_digests (
  id bigserial primary key,
  subject text not null,
  body_html text not null,
  sent_at timestamptz not null default now(),
  subscriber_count int not null default 0,
  errors jsonb not null default '[]'::jsonb
);

alter table public.newsletter_digests enable row level security;
grant all on public.newsletter_digests to service_role;
grant usage, select on sequence newsletter_digests_id_seq to service_role;

-- Pre-seed two email templates: confirm + weekly digest skeleton.
insert into public.email_templates (key, subject, body_html) values
  ('newsletter_confirm',
   'Confirm your Eurospending subscription',
   '<p>Hi,</p><p>Click below to confirm your weekly Eurospending email:</p><p><a href="{{confirm_url}}">Confirm subscription</a></p><p style="color:#888;font-size:12px;">If you didn''t sign up, you can ignore this — no further emails will be sent.</p>'),
  ('newsletter_weekly_digest',
   'Eurospending — week of {{week_label}}',
   '<h2>This week in EU economics</h2>{{intro_html}}<h3>New articles</h3>{{articles_html}}<h3>Notable moves</h3>{{events_html}}<hr><p style="color:#888;font-size:12px;"><a href="{{unsubscribe_url}}">Unsubscribe</a></p>')
on conflict (key) do update set
  subject = excluded.subject, body_html = excluded.body_html, updated_at = now();

notify pgrst, 'reload schema';
