-- Security hardening (applied to the project 2026-09-16).
--
-- 1. profiles.role / profiles.email are server-owned. RLS lets a user update
--    their own row, so without this a student could set role = 'admin'.
-- 2. Auto-admin for allow-listed emails only once the email is CONFIRMED.
-- 3. Group codes: 8 chars from an unambiguous alphabet; 10 failed joins/hour.

create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed by the user' using errcode = '42501';
  end if;
  if new.email is distinct from old.email then
    raise exception 'email is managed by authentication' using errcode = '42501';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.profiles_guard_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' or auth.uid() is null then
    return new;
  end if;
  new.role := 'user';
  return new;
end; $$;
drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert before insert on public.profiles
  for each row execute function public.profiles_guard_insert();

update public.profiles p set role = 'user'
 where role = 'admin' and not exists (select 1 from public.admin_emails a where a.email = lower(p.email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_role text := 'user';
begin
  if new.email_confirmed_at is not null and exists (
    select 1 from public.admin_emails a where a.email = lower(trim(coalesce(new.email, '')))
  ) then assigned_role := 'admin'; end if;
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,'student'),'@',1)),
    assigned_role)
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or new.email is distinct from old.email) then
    update public.profiles set email = new.email,
      role = case when exists (select 1 from public.admin_emails a where a.email = lower(trim(coalesce(new.email, '')))) then 'admin' else role end
     where id = new.id;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at, email on auth.users
  for each row execute function public.handle_user_confirmed();

create table if not exists public.join_attempts (
  user_id uuid not null, at timestamptz not null default now()
);
create index if not exists join_attempts_idx on public.join_attempts (user_id, at desc);
alter table public.join_attempts enable row level security;   -- no policies: definer-only

create or replace function public.create_group(p_name text, p_school text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_code text; v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_i int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    v_code := '';
    for v_i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.study_groups where code = v_code);
  end loop;
  insert into public.study_groups (code, name, school, owner_id)
    values (v_code, left(trim(p_name), 60), nullif(left(trim(coalesce(p_school,'')), 80), ''), auth.uid()) returning id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());
  return jsonb_build_object('id', v_id, 'code', v_code, 'name', left(trim(p_name), 60));
end; $$;

create or replace function public.join_group(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_name text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.join_attempts where at < now() - interval '1 hour';
  if (select count(*) from public.join_attempts where user_id = auth.uid()) >= 10 then
    raise exception 'Too many attempts — try again in an hour' using errcode = '42501';
  end if;
  select id, name into v_id, v_name from public.study_groups where upper(code) = upper(trim(p_code));
  if v_id is null then
    insert into public.join_attempts (user_id) values (auth.uid());
    return null;
  end if;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id', v_id, 'name', v_name);
end; $$;
