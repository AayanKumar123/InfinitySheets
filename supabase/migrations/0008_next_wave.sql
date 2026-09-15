-- Next-wave features: syllabus topics (admin import), question quality
-- flags, read-only progress shares, study groups + leaderboard, weekly
-- digest opt-in. Every table has RLS; cross-user reads go through
-- SECURITY DEFINER functions that return only aggregate / consented data.

-- ---------------------------------------------------------------------------
-- 11. Syllabus topics imported from a board's syllabus PDF (admin-written,
--     readable by everyone; overrides the built-in TOPICS map per subject).
-- ---------------------------------------------------------------------------
create table if not exists public.syllabus_topics (
  board       text not null,
  subject     text not null,
  topics      jsonb not null default '[]'::jsonb,   -- [{ name, summary }]
  source      text,                                  -- file name / URL
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (board, subject)
);
alter table public.syllabus_topics enable row level security;
drop policy if exists syllabus_topics_read on public.syllabus_topics;
create policy syllabus_topics_read on public.syllabus_topics for select using (true);
drop policy if exists syllabus_topics_admin_write on public.syllabus_topics;
create policy syllabus_topics_admin_write on public.syllabus_topics for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 12. Question quality flags. Students flag; admins review. A question with
--     3+ open flags is hidden from worksheets (see flagged_question_ids()).
-- ---------------------------------------------------------------------------
create table if not exists public.question_flags (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_id  text,                 -- past_papers.id when known
  question     text not null,        -- stem, so AI-generated questions can be flagged too
  subject      text,
  reason       text not null,        -- wrong-answer | unclear | off-syllabus | typo | other
  note         text,
  status       text not null default 'open',   -- open | fixed | dismissed
  created_at   timestamptz not null default now()
);
create index if not exists question_flags_status_idx on public.question_flags (status, created_at desc);
alter table public.question_flags enable row level security;
drop policy if exists question_flags_insert_own on public.question_flags;
create policy question_flags_insert_own on public.question_flags for insert with check (auth.uid() = user_id);
drop policy if exists question_flags_select on public.question_flags;
create policy question_flags_select on public.question_flags for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists question_flags_admin_update on public.question_flags;
create policy question_flags_admin_update on public.question_flags for update using (public.is_admin());
drop policy if exists question_flags_admin_delete on public.question_flags;
create policy question_flags_admin_delete on public.question_flags for delete using (public.is_admin());

-- Ids of bank questions with 3+ open flags — hidden from new worksheets.
create or replace function public.flagged_question_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select question_id from public.question_flags
  where status = 'open' and question_id is not null
  group by question_id having count(*) >= 3;
$$;
grant execute on function public.flagged_question_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- 14. Read-only progress shares (teacher / parent link).
-- ---------------------------------------------------------------------------
create table if not exists public.progress_shares (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
alter table public.progress_shares enable row level security;
drop policy if exists progress_shares_own on public.progress_shares;
create policy progress_shares_own on public.progress_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anyone with the token gets a summary — never raw answers or the email.
create or replace function public.shared_progress(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid;
  v_name text;
  v_track text;
  v_out jsonb;
begin
  select user_id into v_user from public.progress_shares where token = p_token and revoked_at is null;
  if v_user is null then return null; end if;
  select coalesce(name, 'Student'), exam_track into v_name, v_track from public.profiles where id = v_user;
  select jsonb_build_object(
    'name', v_name,
    'examTrack', v_track,
    'streak', (select coalesce(streak, 0) from public.user_settings where user_id = v_user),
    'courses', (select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'exam', c.exam, 'subjects', c.data->'subjects')), '[]'::jsonb) from public.courses c where c.user_id = v_user),
    'worksheets', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'subject', w.subject, 'topic', w.topic, 'score', w.score, 'total', w.total, 'correct', w.correct, 'difficulty', w.difficulty, 'date', w.created_at, 'questions', (select jsonb_agg(jsonb_build_object('_topic', q->>'_topic')) from jsonb_array_elements(coalesce(w.questions, '[]'::jsonb)) q), 'results', w.data->'results') order by w.created_at desc), '[]'::jsonb) from public.worksheets w where w.user_id = v_user)
  ) into v_out;
  return v_out;
end;
$$;
grant execute on function public.shared_progress(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 15. Study groups: join by code, weekly leaderboard (questions answered).
-- ---------------------------------------------------------------------------
create table if not exists public.study_groups (
  id          text primary key default ('g_' || replace(gen_random_uuid()::text, '-', '')),
  code        text not null unique,
  name        text not null,
  school      text,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id    text not null references public.study_groups(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
-- Definer helper so the membership policies do not recurse into themselves.
create or replace function public.is_group_member(p_group text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members m where m.group_id = p_group and m.user_id = auth.uid());
$$;
grant execute on function public.is_group_member(text) to authenticated;
drop policy if exists study_groups_member_read on public.study_groups;
create policy study_groups_member_read on public.study_groups for select using (public.is_group_member(id));
drop policy if exists study_groups_owner_write on public.study_groups;
create policy study_groups_owner_write on public.study_groups for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists group_members_read on public.group_members;
create policy group_members_read on public.group_members for select using (public.is_group_member(group_id));
drop policy if exists group_members_leave on public.group_members;
create policy group_members_leave on public.group_members for delete using (user_id = auth.uid());

-- Join by code (the code is the only thing a member needs to know).
create or replace function public.join_group(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_name text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id, name into v_id, v_name from public.study_groups where upper(code) = upper(trim(p_code));
  if v_id is null then return null; end if;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('id', v_id, 'name', v_name);
end;
$$;
grant execute on function public.join_group(text) to authenticated;

-- Create a group; the owner is its first member.
create or replace function public.create_group(p_name text, p_school text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id text; v_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.study_groups (code, name, school, owner_id) values (v_code, left(trim(p_name), 60), nullif(left(trim(coalesce(p_school,'')), 80), ''), auth.uid()) returning id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());
  return jsonb_build_object('id', v_id, 'code', v_code, 'name', left(trim(p_name), 60));
end;
$$;
grant execute on function public.create_group(text, text) to authenticated;

-- Weekly leaderboard for a group the caller belongs to: first names only.
create or replace function public.group_leaderboard(p_group text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row order by (row->>'questions')::int desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'name', split_part(coalesce(p.name, 'Student'), ' ', 1),
      'me', m.user_id = auth.uid(),
      'questions', coalesce((select sum(w.total) from public.worksheets w where w.user_id = m.user_id and w.created_at > now() - interval '7 days'), 0),
      'sheets', coalesce((select count(*) from public.worksheets w where w.user_id = m.user_id and w.created_at > now() - interval '7 days'), 0),
      'accuracy', (select round(100.0 * sum(w.correct) / nullif(sum(w.total), 0)) from public.worksheets w where w.user_id = m.user_id and w.created_at > now() - interval '7 days'),
      'streak', coalesce((select streak from public.user_settings s where s.user_id = m.user_id), 0)
    ) as row
    from public.group_members m
    left join public.profiles p on p.id = m.user_id
    where m.group_id = p_group
      and public.is_group_member(p_group)
  ) t;
$$;
grant execute on function public.group_leaderboard(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Weekly digest opt-in + push reminder preference on user_settings.
-- ---------------------------------------------------------------------------
alter table public.user_settings add column if not exists digest_email boolean not null default false;
alter table public.user_settings add column if not exists push_reminders boolean not null default false;
alter table public.user_settings add column if not exists digest_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Grants: Supabase gives new functions EXECUTE to public by default. Group
-- functions and the flag list need a session; shared_progress stays callable
-- with the anon key on purpose (the teacher / parent link has no login).
-- ---------------------------------------------------------------------------
revoke execute on function public.create_group(text, text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.group_leaderboard(text) from public, anon;
revoke execute on function public.is_group_member(text) from public, anon;
revoke execute on function public.flagged_question_ids() from public, anon;
revoke execute on function public.shared_progress(text) from public;
