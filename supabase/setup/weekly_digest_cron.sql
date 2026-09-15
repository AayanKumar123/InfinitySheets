-- Weekly digest schedule. NOT applied automatically: it needs two values
-- that only the project owner has. Run it once in the SQL editor after
-- deploying supabase/functions/weekly-digest and setting its secrets:
--
--   1. Replace <DIGEST_SECRET> with the same value you set as the function
--      secret DIGEST_SECRET.
--   2. Replace <PROJECT_REF> with the project ref (annyogfzxzznyzkzlodx).
--
-- Every Monday 07:00 UTC. pg_cron + pg_net are available on every Supabase
-- project; enabling them here is idempotent.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('weekly-digest') where exists (select 1 from cron.job where jobname = 'weekly-digest');

select cron.schedule(
  'weekly-digest',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', '<DIGEST_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
