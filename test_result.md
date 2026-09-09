#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Migrate InfinitySheets from MongoDB + custom JWT auth to Supabase (Postgres + Supabase Auth). Auth via email/password + Google OAuth; all study data (profiles, courses, worksheets, mistakes, achievements, user_settings, past_papers) moved from localStorage/Mongo into Postgres with RLS keyed to auth.uid(). Demo mode stays local-only. Migrate local data on first sign-in. Keep FastAPI for past-paper PDF extraction/admin using the service_role key. Acceptance: sign up, complete a worksheet, sign in on another browser, still see worksheet/streak/mistakes."

backend:
  - task: "Supabase schema + RLS + triggers (SQL migrations)"
    implemented: true
    working: true
    file: "supabase/migrations/0001_schema.sql, 0002_rls.sql, 0003_triggers.sql"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Applied to Supabase project via SQL editor. Validated over raw HTTP (GoTrue+PostgREST) with anon key: signup creates instant session; handle_new_user trigger auto-creates profiles + user_settings; A can insert/read own worksheets+mistakes; RLS blocks B from reading A's rows and blocks B inserting rows owned by A (403); anonymous blocked; fresh login (cross-session) sees persisted worksheet+mistakes; past_papers readable by authenticated, non-admin write blocked."

  - task: "FastAPI past-papers migrated to Supabase service_role (+ admin gating, Gemini PDF extraction)"
    implemented: true
    working: "NA"
    file: "backend/server.py, backend/supabase_client.py, backend/auth_supabase.py, backend/past_papers/routes.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Rewrote backend: removed Mongo/JWT auth; past_papers now use a requests-based PostgREST client with service_role (bypasses RLS); token verification via GoTrue /auth/v1/user (project uses legacy HS256); mutations gated by require_admin (profiles.role='admin'); Gemini PDF extraction preserved. NOT run in this sandbox (supervisor is frontend-only on :3000, ingress routes /api to the CRA app). Delivered as code for separate deployment; not tested by an agent."

frontend:
  - task: "Supabase browser client + auth (email/password, Google OAuth, session persistence)"
    implemented: true
    working: true
    file: "frontend/src/lib/supabase.js, frontend/src/context/AppContext.jsx, frontend/src/components/landing/AuthModal.jsx, frontend/src/components/landing/LandingPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Added @supabase/supabase-js client. AppContext apiRegister/apiLogin/apiGoogleAuth/apiLogout now use Supabase; onAuthStateChange restores session across reloads. AuthModal (reuses signup/login data-testids) opens from all existing #signup CTAs. Verified in-browser: signup creates Supabase account, shows success toast, lands in signed-in app (onboarding+dashboard). Google wired via signInWithOAuth (requires dashboard provider setup - documented)."

  - task: "AppContext study-data CRUD synced to Supabase (worksheets, mistakes, courses, settings, profile) + demo local-only + migrate-on-first-signin"
    implemented: true
    working: true
    file: "frontend/src/context/AppContext.jsx, frontend/src/lib/dataStore.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "dataStore maps camelCase<->snake_case with a data jsonb for lossless round-trip. Mutations write to Supabase when signed-in and !isDemo; demo mode never touches network. Migrate-on-first-signin uploads local worksheets/courses/mistakes once (per-user synced flag). Data-layer persistence validated end-to-end. Full UI worksheet-completion + cross-browser check pending (needs frontend testing agent permission)."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Frontend E2E: sign up -> complete a worksheet -> sign in on a different browser session -> worksheet/streak/mistakes persist"
    - "Demo mode stays local-only (no Supabase writes)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Core migration complete and validated at the data layer (auth + RLS + cross-session persistence) and via a browser signup flow. Backend past-papers migrated to service_role but not runnable in this sandbox (frontend-only supervisor). Awaiting user permission before running the frontend testing agent for the full worksheet-completion + cross-browser persistence E2E."
