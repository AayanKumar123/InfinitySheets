-- InfinitySheets schema migration (Supabase / Postgres)
-- One row per record, keyed to auth.users. TEXT ids are used for records that
-- the frontend generates client-side (worksheets, mistakes, courses, past_papers)
-- so local <-> remote upserts dedupe cleanly. profiles.id = auth.users.id (uuid).
-- A `data jsonb` column is kept on the study tables so the exact frontend object
-- shape round-trips without loss (keeps the existing UI working unchanged).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  exam_track  text,
  subjects    jsonb not null default '[]'::jsonb,
  role        text  not null default 'user',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id         text primary key default ('c_' || gen_random_uuid()::text),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text,
  exam       text,
  subjects   jsonb,
  target     text,
  level      text,
  status     text,
  data       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists courses_user_created_idx on public.courses(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- worksheets
-- ---------------------------------------------------------------------------
create table if not exists public.worksheets (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text,
  topic       text,
  score       numeric,
  total       integer,
  correct     integer,
  answers     jsonb,
  questions   jsonb,
  difficulty  text,
  answer_type text,
  duration    integer,
  data        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists worksheets_user_created_idx on public.worksheets(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- mistakes
-- ---------------------------------------------------------------------------
create table if not exists public.mistakes (
  id           text primary key default gen_random_uuid()::text,
  user_id      uuid not null references auth.users(id) on delete cascade,
  worksheet_id text,
  subject      text,
  topic        text,
  question     text,
  options      jsonb,
  correct      jsonb,
  given        jsonb,
  answer_type  text,
  data         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists mistakes_user_created_idx on public.mistakes(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- user_settings: 1:1 with auth.users (also holds streak/goal bookkeeping)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  daily_goal         integer default 10,
  weekly_goal        integer default 50,
  frequency          text    default '3-4 per week',
  default_difficulty text    default 'Medium',
  exam_date          text,
  sound              boolean default true,
  keyboard_shortcuts boolean default true,
  streak             integer default 0,
  last_study_date    text,
  questions_today    integer default 0,
  goal_date          text,
  onboarding_done    boolean default false,
  tutorial_done      boolean default false,
  data               jsonb,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- past_papers: global admin-uploaded question bank (migrated off Mongo).
-- No user_id: readable by all authenticated users, writable only by admins.
-- `data jsonb` holds the full frontend-shaped object so reads round-trip.
-- ---------------------------------------------------------------------------
create table if not exists public.past_papers (
  id           text primary key default ('pp_' || replace(gen_random_uuid()::text, '-', '')),
  subject      text,
  topic        text,
  difficulty   text default 'Medium',
  answer_type  text default 'Multiple choice',
  q            text,
  year         integer,
  board        text,
  marks        integer,
  link         text,
  added_by     text,
  options      jsonb,
  a            integer,
  typed_answer text,
  typed_aliases jsonb,
  exam_answer  text,
  exam_keywords jsonb,
  source       text default 'past-paper',
  data         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists past_papers_subject_idx on public.past_papers(subject);
create index if not exists past_papers_created_idx on public.past_papers(created_at desc);
-- Row Level Security for InfinitySheets.
-- Every table has RLS enabled. Owner-scoped tables allow access only where
-- user_id = auth.uid(). past_papers is readable by all authenticated users and
-- writable only by admins (profiles.role = 'admin'). The FastAPI service_role
-- client bypasses RLS entirely for server-side admin tooling.

-- Admin check as SECURITY DEFINER to avoid RLS recursion when used in policies.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Grants (RLS still restricts row visibility on top of these).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.courses, public.worksheets, public.mistakes,
  public.achievements, public.user_settings, public.past_papers
  to authenticated;
grant select on public.past_papers to anon;

-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.worksheets    enable row level security;
alter table public.mistakes      enable row level security;
alter table public.achievements  enable row level security;
alter table public.user_settings enable row level security;
alter table public.past_papers   enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- generic owner policy helper applied per table (courses/worksheets/mistakes/achievements/user_settings)
-- courses --------------------------------------------------------------------
drop policy if exists "courses_rw_own" on public.courses;
create policy "courses_rw_own" on public.courses
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- worksheets -----------------------------------------------------------------
drop policy if exists "worksheets_rw_own" on public.worksheets;
create policy "worksheets_rw_own" on public.worksheets
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- mistakes -------------------------------------------------------------------
drop policy if exists "mistakes_rw_own" on public.mistakes;
create policy "mistakes_rw_own" on public.mistakes
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- achievements ---------------------------------------------------------------
drop policy if exists "achievements_rw_own" on public.achievements;
create policy "achievements_rw_own" on public.achievements
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- user_settings --------------------------------------------------------------
drop policy if exists "user_settings_rw_own" on public.user_settings;
create policy "user_settings_rw_own" on public.user_settings
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- past_papers ----------------------------------------------------------------
drop policy if exists "past_papers_select_all_auth" on public.past_papers;
create policy "past_papers_select_all_auth" on public.past_papers
  for select to authenticated using (true);
drop policy if exists "past_papers_admin_insert" on public.past_papers;
create policy "past_papers_admin_insert" on public.past_papers
  for insert to authenticated with check (public.is_admin());
drop policy if exists "past_papers_admin_update" on public.past_papers;
create policy "past_papers_admin_update" on public.past_papers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "past_papers_admin_delete" on public.past_papers;
create policy "past_papers_admin_delete" on public.past_papers
  for delete to authenticated using (public.is_admin());
-- Auto-provision a profile + user_settings row whenever a new auth user is
-- created (email/password or Google OAuth). SECURITY DEFINER so it can write
-- past the RLS policies during the signup transaction.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(new.email, 'student'), '@', 1)
    ),
    'user'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
