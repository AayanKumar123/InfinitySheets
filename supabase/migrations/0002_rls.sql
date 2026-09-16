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
