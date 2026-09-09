# InfinitySheets

Adaptive exam-prep study tool. **Auth + all study data now run on Supabase
(Postgres + Supabase Auth)**; a FastAPI service is kept only for non-CRUD admin
tooling (past-paper PDF extraction) using the `service_role` key.

---

## Architecture

- **Frontend** — React (CRA + craco). Talks **directly to Supabase** via
  `@supabase/supabase-js` for auth and every study-data read/write. `AppContext`
  is the single place components touch data (unchanged public API:
  `apiRegister`, `apiLogin`, `apiGoogleAuth`, `apiLogout`, plus all study
  mutations). Demo mode (`state.user.isDemo`) stays **100% local** (localStorage,
  no network).
- **Backend** — FastAPI. Only past-paper admin/PDF-extraction. Uses the
  `service_role` key server-side (bypasses RLS) and verifies caller tokens
  through Supabase GoTrue. **Never** ships the service_role key to the browser.
- **Database** — Supabase Postgres with Row Level Security on every table.

---

## Environment variables

### Frontend — `frontend/.env` (public; only the anon/publishable key)
| Var | Purpose |
|-----|---------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anon/publishable key (safe in browser) |
| `REACT_APP_BACKEND_URL` | FastAPI base URL (past-paper admin endpoints) |

> ⚠️ Never put the `service_role` key (or any secret) in a `REACT_APP_*` var —
> CRA inlines every `REACT_APP_*` value into the public bundle.

### Backend — `backend/.env` (secrets; git-ignored)
| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only; bypasses RLS. Project Settings → API → service_role |
| `EMERGENT_LLM_KEY` | Key for Gemini PDF extraction (`emergentintegrations`) |
| `APP_NAME`, `CORS_ORIGINS`, `FRONTEND_URL` | App/CORS config |

---

## Database schema (Supabase)

SQL lives in `supabase/migrations/` (`0001_schema.sql`, `0002_rls.sql`,
`0003_triggers.sql`; `combined_all.sql` is the three concatenated for one-shot
paste).

| Table | Key columns |
|-------|-------------|
| `profiles` | `id`→auth.users, `name`, `exam_track`, `subjects`, `role` |
| `courses` | `id`, `user_id`, `name`, `exam`, `subjects`, `target`, `level`, `status` |
| `worksheets` | `id`, `user_id`, `subject`, `topic`, `score`, `total`, `correct`, `answers`, `questions`, `difficulty`, `answer_type`, `duration`, `created_at` |
| `mistakes` | `id`, `user_id`, `worksheet_id`, `subject`, `topic`, `question`, `options`, `correct`, `given`, `answer_type`, `created_at` |
| `achievements` | `user_id`, `achievement_id`, `unlocked_at` |
| `user_settings` | `user_id`, goals/frequency/difficulty/exam_date/sound/shortcuts + streak bookkeeping |
| `past_papers` | admin-uploaded question bank (migrated off Mongo) |

Notes: study tables keep a `data jsonb` column so the exact frontend object
round-trips losslessly (keeps the existing UI unchanged). Indexes on
`(user_id, created_at desc)` exist for `worksheets` and `mistakes`.

---

## Row Level Security (summary)

RLS is **enabled on every table**. Policies:

- **profiles** — a user may `select` / `insert` / `update` only the row where
  `id = auth.uid()`.
- **courses / worksheets / mistakes / achievements / user_settings** — full
  CRUD (`FOR ALL`) only on rows where `user_id = auth.uid()` (both `USING` and
  `WITH CHECK`, so a user can't create or move a row to another owner).
- **past_papers** — `select` allowed for **any authenticated user**; `insert` /
  `update` / `delete` allowed **only for admins** (`profiles.role = 'admin'`,
  checked via the `SECURITY DEFINER` function `public.is_admin()`).
- **anonymous (no JWT)** — blocked from all authenticated tables.
- The FastAPI `service_role` client **bypasses RLS** for server-side admin
  writes/extraction.

A trigger `on_auth_user_created` (function `public.handle_new_user`,
`SECURITY DEFINER`) auto-creates a `profiles` + `user_settings` row on every new
signup (email/password and Google).

---

## Manual Supabase dashboard setup (one-time)

1. **Run the schema** — SQL Editor → paste `supabase/migrations/combined_all.sql`
   → Run. (Or apply the three files in order.)
2. **Email auth** — Authentication → Providers → **Email** enabled.
   Set **"Confirm email" = OFF** so sign-up returns an instant session
   (required for the sign-up → immediately-use flow). Turn it back on for
   production if you want verified emails.
3. **URL configuration** — Authentication → URL Configuration:
   - **Site URL** = your app origin (e.g. the preview/prod URL).
   - **Redirect URLs** = add `<your-origin>/**`.
4. **Google OAuth** *(optional, for "Continue with Google")*:
   - Google Cloud Console → create a **Web** OAuth client.
   - Authorized redirect URI = `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
   - Paste the Google **Client ID + Secret** into Supabase →
     Authentication → Providers → **Google**, and enable it.
   - The app's button starts Supabase's redirect flow; no Google client ID is
     exposed in the frontend environment.
5. **Make an admin** (to manage past papers): in SQL Editor,
   `update public.profiles set role='admin' where email='you@example.com';`

---

## Running locally

```bash
# Frontend
cd frontend && yarn install && yarn start        # http://localhost:3000

# Backend (separate service; needs SUPABASE_SERVICE_ROLE_KEY)
cd backend && pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```
