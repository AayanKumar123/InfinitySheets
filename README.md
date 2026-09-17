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
  mutations).
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
5. **Account deletion** is self-service: Settings → Delete account calls
   `public.delete_own_account()` (SECURITY DEFINER), which removes the auth
   row and cascades to every table the user owns.
6. **Make an admin** (to manage past papers): in SQL Editor,
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

---

## Next-wave features (merged to `main`)

Everything below ships in the app; the three marked **needs config** work
end-to-end once the owner adds the listed keys (nothing is exposed in the
frontend bundle).

| # | Feature | Where | Notes |
|---|---------|-------|-------|
| 1 | ~~Confidence rating~~ | removed | Dropped at the owner's request. |
| 2 | Adaptive difficulty | Builder → *Adaptive* next to the difficulty picker | `lib/adaptive.js`: ≥85 % on the last 6 sheets' questions for those topics → step up, <55 % → step down. Shows the reason; overridable. |
| 3 | Mistake-reason tagging | Result screen → *Why?* chips on wrong answers | Saved on the sheet (`reasons`) and the mistake row; Strengths & Weaknesses shows *Why you lose marks* (knowledge vs technique). |
| 4 | Exam simulation | Builder → *Exam simulation* | `lib/examPresets.js` has a paper structure per board (sections, counts, marks, time, negative marking for JEE/NEET). One AI call per section; result converts marks → board grade. |
| 5 | Worked solutions | Result screen → *Show me the working* | `ai-chat` mode `solution`; cached on the sheet (`solutions[i]`). |
| 6 | Flashcards | Sidebar → Flashcards | SaveMyExams-style: subject → topic → concept deck (AI-written once per topic, `ai-chat` mode `flashcards`, cached) plus the student's missed questions; **I knew it / I didn't know it** only. Unknowns re-queue in the session; known cards rest 1→3→7→14→30 days. Progress in `user_settings.data.flashcards`. |
| 7 | Weekly email digest — **needs config** | Settings → *Reminders & digest* | Edge function `weekly-digest` + `supabase/setup/weekly_digest_cron.sql`. Secrets: `DIGEST_SECRET`, `RESEND_API_KEY`, `DIGEST_FROM`, `APP_URL`. Without `RESEND_API_KEY` it dry-runs. |
| 8 | Push reminders | Settings → *Daily study reminder* | Local Notifications (`lib/reminders.js`), once a day at the chosen hour when reviews are due / streak at risk, while the app is open. No push server needed. |
| 9 | AI study plan | Smart Learning → *This week's plan* | `ai-chat` mode `plan`; tasks tick off and open the builder pre-filled. |
| 10 | Goals & badges | Dashboard card | `lib/badges.js` — 18 badges derived from state; unlock dates saved in `user_settings.data.badges`. |
| 11 | Bulk syllabus import | Admin → *Syllabus topics* | Upload the board's syllabus PDF → `ai-chat` mode `syllabus` → `public.syllabus_topics`; overrides the built-in topic list for that board+subject in the builder. |
| 12 | Question quality flags | Any question → *Report*; Admin → *Reported questions* | `public.question_flags`; 3+ open flags hide a bank question from new sheets (`flagged_question_ids()`). |
| 13 | Past-paper library browser | Syllabus Bank → year / answer-type filters → *Attempt the YYYY paper* | Runs the filtered questions as one worksheet in printed order. Filters appear once uploaded papers carry a `year`. |
| 14 | ~~Teacher / parent share~~ | removed | Dropped at the owner's request (the `progress_shares` table and `shared_progress()` RPC remain in the database, unused). |
| 15 | Study groups | Sidebar → Study Groups | `study_groups` / `group_members`, 8-character join code (10 failed tries/hour), weekly *activity* view (`group_leaderboard()`, first names only, **no ranks** — alphabetical). Real accounts only. |
| 16 | ~~Offline mode~~ | removed | Dropped at the owner's request; reminders now use plain page Notifications (`lib/reminders.js`). |
| 17 | Google sign-in — **needs config** | Log in / Sign up → *Continue with Google* | Code is in place (`apiGoogleAuth`); follow step 4 of the dashboard setup above. |
| 18 | Analytics events — **needs config** | `lib/analytics.js` | Set `REACT_APP_POSTHOG_KEY` (+ optional `REACT_APP_POSTHOG_HOST`) or `REACT_APP_PLAUSIBLE_DOMAIN`. Events: `worksheet_started/completed`, `badge_unlocked`, `flashcard_rated`, `study_plan_generated`, `question_flagged`, `solution_requested`, `mistake_tagged`, `share_created`, `group_created/joined`, `pageview`. No-op (dev console only) without a key. |

Database changes for this wave: `supabase/migrations/0008_next_wave.sql`
(applied to the project). Edge functions: `ai-chat` v17 (new modes
`solution`, `plan`, `syllabus`), `weekly-digest` v1.

### Wave 2

| Feature | Where | Notes |
|---|---|---|
| Age band + AI consent gate | Once, after onboarding; editable in Settings → *Privacy & your data* | Under-13s need a parent's OK before the AI is on; `state.consent` saved with settings. Privacy page now has *AI helpers*, *Children* and *Study groups* sections. |
| Download my data | Settings → *Privacy & your data* | Full JSON export, or worksheets as CSV. `lib/exportData.js`. |
| Command palette | **Ctrl/⌘ K** or the header *Search* button | Pages, subjects, topics (→ overview) and "Worksheet on …". |
| Today's 5 | Dashboard | Daily 5-question sheet on the weakest topics, deterministic per day, with its own run counter. `lib/dailyChallenge.js`; sheets carry `challenge: 'YYYY-MM-DD'`. |
| Focus timer | Dashboard | 25/5, 45/10, 15/3 blocks; sessions logged to `focusSessions`. |
| Topic mastery | Dashboard card | Not started → Novice → Learning → Solid → Mastered from accuracy × evidence × recency. `lib/mastery.js`. |
| Ask about this question | Result screen, wrong answers | Chat primed with the question, correct answer and the student's answer. |
| Print flashcards | Flashcards → *Print deck (PDF)* | Double-sided A4, mirrored backs. |
| Follow device theme | Settings → Accessibility | `themeMode: 'system'` mirrors `prefers-color-scheme`. |

Fix: a topic preselected from the Syllabus Bank / study plan / Today's 5 was reset to the subject's first topic on mount (StrictMode double-effect); the reset now only fires on a real subject change.

### Wave 3

- **Mistake-reason chips are optional**: Settings → Accessibility → *Ask why I missed a question* (default on; chips are labelled "optional").
- **Flashcards explain the concept**: on the answer side, *Explain the concept I missed* asks the AI for the idea, the one rule and the trap; cached per card.
- **Study groups are not competitive**: no rank column, alphabetical, your own row highlighted — "what the group did this week", not a leaderboard.
- **Study plan shows the exam countdown** and plans back from that date.
- **Study groups** need an account; there is no sample group.

### Ads (parked)

All nine ad placements are still in the code (`frontend/src/components/ads/AdSlot.jsx`) but render **nothing** until ads are switched on: set `REACT_APP_ADS=on` in `frontend/.env`, fill `AD_UNITS` with the network's unit ids, load the network script in `public/index.html`, and — because students are minors — mark the site child-directed and serve non-personalised ads only.

