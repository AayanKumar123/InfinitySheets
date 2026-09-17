-- Applied 2026-09-17. Admin is only ever possible for the addresses in
-- public.admin_emails, no matter who writes the row (clients, triggers, edge
-- functions, the dashboard). is_admin() re-checks the allow-list, so a stray
-- role value can never unlock the admin RLS policies. Trigger functions are
-- taken off /rpc, anonymous callers lose every RPC, and the removed
-- teacher/parent share feature's table + anonymous function are dropped.

create or replace function public.admin_allowlist_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' and not exists (
    select 1 from public.admin_emails a where a.email = lower(trim(coalesce(new.email, '')))
  ) then
    new.role := 'user';
  end if;
  return new;
end $$;
drop trigger if exists profiles_admin_allowlist on public.profiles;
create trigger profiles_admin_allowlist
  before insert or update on public.profiles
  for each row execute function public.admin_allowlist_guard();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.admin_emails a on a.email = lower(trim(coalesce(p.email, '')))
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

update public.profiles p set role = 'user'
 where p.role = 'admin' and not exists (select 1 from public.admin_emails a where a.email = lower(trim(coalesce(p.email, ''))));

revoke execute on function public.admin_allowlist_guard() from public, anon, authenticated;
revoke execute on function public.profiles_guard() from public, anon, authenticated;
revoke execute on function public.profiles_guard_insert() from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop function if exists public.shared_progress(text);
drop table if exists public.progress_shares;

revoke execute on function public.is_admin() from anon;
revoke execute on function public.create_group(text, text) from anon;
revoke execute on function public.join_group(text) from anon;
revoke execute on function public.group_leaderboard(text) from anon;
revoke execute on function public.is_group_member(text) from anon;
revoke execute on function public.flagged_question_ids() from anon;
revoke execute on function public.delete_own_account() from anon;
