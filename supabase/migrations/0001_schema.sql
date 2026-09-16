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
