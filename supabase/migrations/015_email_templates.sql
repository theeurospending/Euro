-- 015_email_templates.sql
-- Email templates with {{var}} placeholders. Used by Session 10 (social) and beyond.

create table if not exists public.email_templates (
  key text primary key,
  subject text not null,
  body_html text not null,
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

grant select on public.email_templates to authenticated;
grant all on public.email_templates to service_role;

-- Sample template used as a default for admin "send test to me" buttons.
insert into public.email_templates (key, subject, body_html) values
  ('admin_test',
    'Eurospending — test email',
    '<p>Hello {{name}},</p><p>This is a test email from Eurospending at {{timestamp}}.</p>')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
