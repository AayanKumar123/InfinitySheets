-- A signed-in user can delete their own account from Settings. Removing the
-- auth row cascades to profiles, courses, worksheets, mistakes, achievements
-- and user_settings (every FK is ON DELETE CASCADE). Applied live 2026-09-15.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
