-- ============================================================
-- profiles: 1 row per auth.users row, created automatically.
-- Read-only from the app: no UPDATE policies on purpose.
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,                                 -- snapshot, for admin views
  role       text not null default 'student'
               check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App-level profile, 1:1 with auth.users (read-only)';

-- ------------------------------------------------------------
-- Auto-create a profile for every new auth user.
-- security definer: the auth hook runs as supabase_auth_admin,
-- which has no direct privileges on public.profiles.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Backfill users that existed before this migration.
-- ------------------------------------------------------------
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RLS: everyone reads their own row, admins read all.
-- No UPDATE / INSERT / DELETE policies -> app-side writes blocked,
-- and the trigger above bypasses RLS as the table owner.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());
