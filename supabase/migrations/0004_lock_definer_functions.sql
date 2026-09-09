-- Advisor fixes: trigger functions must not be callable via PostgREST rpc.
-- is_admin() stays executable by `authenticated` because the past_papers
-- RLS policies evaluate it as the querying user; anon only ever hits the
-- `using (true)` select policy so it never needs it.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
revoke execute on function public.is_admin() from anon, public;
grant execute on function public.is_admin() to authenticated;
