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

  - task: "Dashboard 'My subjects' grid mirrors Start Studying; cards open Subject Overview"
    implemented: true
    working: true
    file: "frontend/src/components/app/Dashboard.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Added a 'My subjects' section to the Dashboard using the same enrolled-subjects derivation as StartStudying (courses -> user.subjects -> track fallback), with per-subject board + IB HL/SL badges. Each card navigates to #study?subject=<name>, which renders SubjectOverview. Verified in demo mode desktop (1920) and mobile (390, no overflow): grid shows all subjects and clicking Mathematics opened the Subject Overview page."

  - task: "Start Studying: 'Subjects Taken' / 'Subjects Not Taken' split + '+ Add Subject' -> pick course"
    implemented: true
    working: true
    file: "frontend/src/components/app/StartStudying.jsx, frontend/src/context/AppContext.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Start Studying now splits subjects into two sections: 'Subjects Taken' (enrolled) and 'Subjects Not Taken' (everything else), both filtered by the search box. Each not-taken card has a '+ Add Subject' button that opens a modal listing the student's courses; picking one appends the subject to that course via updateCourse (idempotent guard against duplicates), after which it moves into 'Subjects Taken'. If no courses exist, the modal prompts to create one. Verified in demo desktop: created a JEE course, added Biology to it via the modal (toast 'Added Biology to JEE Term'), Biology moved to Taken with JEE board tag. Mobile 390px: no horizontal scroll (only decorative SVGs overflow)."

  - task: "Question Bank sources questions from the past-paper library (board-aware), not the curated mock"
    implemented: true
    working: "NA"
    file: "frontend/src/components/app/QuestionBank.jsx, frontend/src/lib/subjects.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "User bug: a CBSE Mathematics past-paper question did not appear in the Question Bank because QB read from the curated QUESTION_BANK mock. Rewrote QuestionBank to build its questions from state.pastPapers (seeded past papers + admin uploads), grouped by the student's subjects and honouring each subject's course board (subject's board falls back to the exam track). Subject list now comes from the shared enrolledSubjects() = 'My subjects'. Needs testing agent verification."

  - task: "Create-a-Worksheet + Question Bank subject lists exactly match 'My subjects' (shared lib/subjects.js)"
    implemented: true
    working: "NA"
    file: "frontend/src/lib/subjects.js, frontend/src/components/app/Worksheets.jsx, frontend/src/components/app/QuestionBank.jsx, frontend/src/components/app/StartStudying.jsx, frontend/src/components/app/Dashboard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "User bug: taking CBSE Mathematics + IB Mathematics AA HL showed only one 'Mathematics' in Create-a-Worksheet because it intersected course subjects with SUBJECTS[track] (single track), dropping non-track subjects and collapsing duplicates. Extracted the exact 'My subjects' derivation into lib/subjects.js (enrolledSubjects/subjectBoards/boardName) and used it in StartStudying, Dashboard, Worksheets and QuestionBank so all four lists are identical (no track filtering). Worksheets also gains a past-paper topic fallback so non-track subjects still have topics. Needs testing agent verification."

  - task: "SAT & NEET are a single subject each (SAT->['SAT'], NEET->['NEET']) across subjects/topics/past-papers"
    implemented: true
    working: false
    file: "frontend/src/data/mock.js, frontend/src/data/pastPapers.js"
    stuck_count: 1
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "SUBJECTS.SAT=['SAT'], SUBJECTS.NEET=['NEET']; added TOPICS.SAT/NEET (union of former sub-subject topics), SUBJECT_INFO.SAT/NEET; retagged SEED_PAST_PAPERS SAT (Math/Reading/Writing)->subject 'SAT' and NEET (Biology/Chemistry)->subject 'NEET'. Creating an SAT or NEET course should now yield exactly one subject. Needs testing."
        -working: false
        -agent: "testing"
        -comment: "CRITICAL BUG: CourseWizard exam selection has a selector issue. When using button:has-text('SAT'), Playwright matches 'LSAT' instead because 'LSAT' contains 'SAT'. The wizard shows 'LR Logical Reasoning' and 'RC Reading Comprehension' (LSAT subjects) instead of the single 'SAT' subject. This is a UI/selector bug in the CourseWizard component. The button text matching needs to be exact, or the buttons need unique data-testids. Additionally, after clicking Finish in the wizard, the modal remains open and blocks navigation (CourseWizard modal intercepts pointer events). Could not complete SAT/NEET single subject testing due to these blocking issues."

  - task: "Add-subject modal: create NEW course on the spot + IB HL/SL on add; Remove on Taken cards; collapsible 'Not Taken'; board label uses real course board only"
    implemented: true
    working: "NA"
    file: "frontend/src/components/app/StartStudying.jsx, frontend/src/components/app/QuestionBank.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Rewrote StartStudying: Add-subject modal now has 'Existing course' and 'New course' tabs. New course = name + exam board select + (IB only) HL/SL, then Create-course-and-add. Adding to an existing IB course reveals an inline HL/SL choice before Add. Taken cards that belong to a course show a 'Remove' button (window.confirm) that drops the subject from its course(s) (empty course is deleted). 'Subjects Not Taken' is collapsed by default with a Show/Hide toggle (auto-expands during search). Board bug fix: QuestionBank subject cards no longer label every subject 'CBSE' — a board tag shows only when the subject actually belongs to a course. Needs testing."

  - task: "Continue/resume in-progress worksheet from Dashboard & Worksheet History (draft persistence)"
    implemented: true
    working: "NA"
    file: "frontend/src/context/AppContext.jsx, frontend/src/components/app/Worksheets.jsx, frontend/src/components/app/Dashboard.jsx, frontend/src/components/app/WorksheetHistory.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added state.draftWorksheet (local-only, persisted via existing localStorage cache; preserved across Supabase load). Worksheets take-stage auto-saves a draft as the student answers/navigates and on unmount; a new 'Save & exit' button (ws-save-exit) saves and returns to dashboard. Completing a worksheet (recordWorksheet) clears the draft. Dashboard shows a 'Continue worksheet' banner (dashboard-continue-worksheet with dashboard-resume-worksheet / dashboard-discard-worksheet); Worksheet History shows the same (history-continue-worksheet). Resuming sets sessionStorage resume_ws_draft and reopens Worksheets in the take stage restoring subject/topics/questions/answers/current/timeLeft. Also added data-testid exam-<id> to CourseWizard exam buttons to disambiguate SAT vs LSAT. Needs testing agent verification."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Continue worksheet: leave mid-worksheet -> Dashboard & History show Continue -> resume restores progress"
    - "SAT/NEET single subject (use exam-SAT / exam-NEET testids)"
    - "Question Bank sources from past papers with correct board; subject lists == My subjects"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "PRIMARY: verify Continue/resume worksheet. In DEMO mode (Try Demo, admin123/admin123; click Skip if a tutorial overlay shows). STEPS: (1) Open 'Create a New Worksheet' (#worksheets) and click data-testid 'ws-start' to begin the interactive worksheet (take stage). (2) Answer the first question (press keyboard 'a' or click an option), then click 'ws-save-exit' (Save & exit) — you should land on the Dashboard with a toast. (3) Dashboard must show a Continue banner (data-testid 'dashboard-continue-worksheet') with subject/topic and 'X of N answered'. Click 'dashboard-resume-worksheet' — it must reopen the worksheet in the take stage (data-testid 'ws-save-exit' present) at the saved question. (4) Go to Worksheet History (#history) and confirm the Continue banner (data-testid 'history-continue-worksheet') with 'history-resume-worksheet' also resumes. (5) Resume once more and click through to the last question and Submit; after submitting, the draft must be GONE (no Continue banner on Dashboard or History). (6) Start a new worksheet, click ws-save-exit, then on Dashboard click 'dashboard-discard-worksheet' — banner disappears. \nSECONDARY (regression, now unblocked by exam-<id> testids): In My Courses -> Add course, select the SAT exam using data-testid 'exam-SAT' (NOT text match, to avoid LSAT), set a date via an 'In 30 days' button, finish. Start Studying 'Subjects Taken' must show exactly ONE 'SAT' subject. Repeat with 'exam-NEET' -> exactly one 'NEET'. Question Bank subject cards must show correct board tags (not all 'CBSE') and SAT questions should come from the past-paper library. The Create-a-Worksheet subject dropdown (ws-subject) and Question Bank subjects must equal the Start Studying 'Subjects Taken' set. Frontend-only; use Demo mode."
    -agent: "testing"
    -message: "CRITICAL BLOCKING BUG FOUND: CourseWizard exam selection buttons do not have unique identifiers. When selecting 'SAT', the text selector matches 'LSAT' instead (because 'LSAT' contains 'SAT'). Screenshot shows wizard displaying 'LR Logical Reasoning' and 'RC Reading Comprehension' (LSAT subjects) instead of single 'SAT' subject. Additionally, after clicking Finish, the CourseWizard modal remains open and blocks all navigation (intercepts pointer events). REQUIRED FIXES: 1) Add unique data-testids to exam track buttons in CourseWizard (e.g., data-testid='exam-SAT', data-testid='exam-LSAT'). 2) Ensure wizard modal closes properly after course creation. 3) Use exact text matching or unique selectors for exam selection. Cannot proceed with SAT/NEET testing until these issues are resolved. Other test cases (Question Bank, Add Subject modal, Remove, Collapse, Consistency) also blocked by inability to create courses."
