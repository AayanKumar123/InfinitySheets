-- Pre-authorised admins. A person on this list gets role='admin' the moment they
-- sign up, so nobody has to be promoted by hand after the fact.
create table if not exists public.admin_emails (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);

-- No policies + RLS on = unreachable through the public API. Only the
-- SECURITY DEFINER trigger below and the service_role can read it.
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

insert into public.admin_emails (email, note) values
  ('aayan.robins@gmail.com', 'owner'),
  ('angelojolwin22@gmail.com', 'owner')
on conflict (email) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  assigned_role text := 'user';
begin
  if exists (
    select 1 from public.admin_emails a
    where a.email = lower(trim(coalesce(new.email, '')))
  ) then
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, name, role)
  values (new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,'student'),'@',1)),
    assigned_role)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $function$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

update public.profiles p
   set role = 'admin'
  from public.admin_emails a
 where lower(trim(p.email)) = a.email
   and p.role is distinct from 'admin';
