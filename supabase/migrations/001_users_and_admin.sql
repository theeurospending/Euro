-- 001_users_and_admin.sql
-- Public user profile table mirroring auth.users, with admin flags.
-- The `id` column references auth.users(id) for 1:1 join.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  is_admin boolean not null default false,
  is_superadmin boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_is_admin_idx on public.users (is_admin) where is_admin = true;

-- Auto-insert a profile row when a new auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- RLS: a user can read/update their own row. Admin access is via service role.
alter table public.users enable row level security;

drop policy if exists "users self select" on public.users;
create policy "users self select" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users
  for update using (auth.uid() = id);

-- Helpful: after your first signup, run this in SQL editor to promote yourself:
-- update public.users set is_admin = true, is_superadmin = true where email = 'you@example.com';
