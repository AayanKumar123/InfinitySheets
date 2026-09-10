-- Shared cache for AI topic overviews.
--
-- An overview for (board, subject, topic, level) is identical for every
-- student, so generating it once and reusing it turns a per-student-per-visit
-- Gemini call into a single call for all time. That is the difference between
-- a demo and something a class can use: the Gemini free tier allows only 20
-- requests per day per model.
--
-- Only the ai-chat edge function touches this table, using the service_role
-- key, so RLS is enabled with no policies at all — the table is unreachable
-- through the public API and a client can neither read the cache nor poison
-- it. The function treats the cache as best-effort: if the database is
-- unavailable it falls back to calling Gemini directly.
create table if not exists public.topic_overviews (
  id          text primary key,           -- normalised board|subject|topic|level
  board       text not null,
  subject     text not null,
  topic       text not null,
  ib_level    text,
  body        text not null,
  model       text,                       -- which model produced it
  hits        integer not null default 0, -- reads served from cache
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists topic_overviews_lookup_idx
  on public.topic_overviews (board, subject, topic);

alter table public.topic_overviews enable row level security;
revoke all on public.topic_overviews from anon, authenticated;

-- Counting a hit must not require the caller to hold write access, so it is a
-- SECURITY DEFINER function rather than a direct UPDATE.
create or replace function public.bump_topic_overview_hit(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.topic_overviews set hits = hits + 1 where id = p_id;
$$;
revoke execute on function public.bump_topic_overview_hit(text) from anon, authenticated, public;
