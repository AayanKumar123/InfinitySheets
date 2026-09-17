/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { SUBJECTS, TOPICS } from '../data/mock';
import { SEED_PAST_PAPERS } from '../data/pastPapers';
import { enrolledSubjects, primaryTrack } from '../lib/subjects';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as store from '../lib/dataStore';
import { computeBadges, BADGES } from '../lib/badges';
import { markCard } from '../lib/flashcards';
import { initAnalytics, identify, track } from '../lib/analytics';
import { toast } from 'sonner';

// Study data now lives in Supabase (Postgres + RLS) when the user is signed in
// with a real account.
const STORAGE_KEY = 'infinitysheets_state_v1';
const isProd = process.env.NODE_ENV === 'production';

function logError(scope, err) {
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.warn(`[AppContext:${scope}]`, err);
  }
}

const defaultState = {
  user: null, // { id, name, email, role, examTrack, subjects? }
  worksheets: [],
  mistakes: [],
  courses: [],
  pastPapers: SEED_PAST_PAPERS,
  streak: 0,
  lastStudyDate: null,
  tutorialDone: false,
  onboardingDone: false,
  theme: 'dark',
  settings: {
    dailyGoal: 10,
    weeklyGoal: 50,
    frequency: '3-4 per week',
    defaultDifficulty: 'Medium',
    examDate: '',
    keyboardShortcuts: true,
    sound: true,
    aiEnabled: true,
    askMistakeReason: true,
    glass: 50,
    glassOff: false,
    digestEmail: false,
    pushReminders: false,
    reminderHour: 18,
  },
  // Next wave: flashcard progress, the AI study plan, unlocked badges and
  // admin-imported syllabus topics (public, read-only for students).
  flashcards: { cards: {}, reviewed: 0 },
  studyPlan: null,
  badges: {},
  syllabusTopics: [],
  flaggedQuestionIds: [],
  // Wave 2: age band + AI consent (asked once), focus-timer sessions, and
  // whether the theme follows the OS.
  consent: null,
  themeMode: 'manual',
  focusSessions: [],
  questionsToday: 0,
  goalDate: null,
  // In-progress worksheet the student left mid-way (null when none). Lets them
  // resume from the Dashboard / Worksheet History.
  draftWorksheet: null,
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);

  // Latest-state ref so async sync helpers read fresh values.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const bootstrappedRef = useRef(null);

  // Cloud-sync status for the header badge: idle | saving | saved | error | local
  const [syncStatus, setSyncStatus] = useState('idle');
  const pendingRef = useRef(0);

  // ---- sync helpers -------------------------------------------------------
  const canSync = () => {
    const u = stateRef.current.user;
    return !!(u && u.id && isSupabaseConfigured);
  };
  const uid = () => stateRef.current.user && stateRef.current.user.id;
  const bg = (factory, scope) => {
    if (!canSync()) return;
    pendingRef.current += 1;
    setSyncStatus('saving');
    Promise.resolve().then(factory)
      .then(() => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) setSyncStatus('saved');
      })
      .catch((e) => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        logError(scope, e);
        setSyncStatus('error');
      });
  };

  // Pull a signed-in user's full state from Supabase (source of truth),
  // migrating any local-only data on the very first sign-in for that user.
  const bootstrapCore = useCallback(async (authUser) => {
    const userId = authUser.id;
    // One-time migration of pre-existing localStorage data.
    try {
      const flagKey = `infinitysheets_synced_${userId}`;
      const local = stateRef.current;
      const already = localStorage.getItem(flagKey);
      const localHasData = local && !local.fromDemo &&
        ((local.worksheets || []).length || (local.mistakes || []).length || (local.courses || []).length);
      if (!already && localHasData) {
        try {
          await store.migrateLocal(
            { worksheets: local.worksheets, mistakes: local.mistakes, courses: local.courses },
            userId,
          );
        } catch (e) { logError('migrate', e); }
      }
      localStorage.setItem(flagKey, '1');
    } catch (e) { logError('migrate/flag', e); }

    try {
      const loadedState = await store.loadAll(userId, authUser);
      setState((s) => withTrack({ ...defaultState, theme: s.theme, draftWorksheet: s.draftWorksheet, ...loadedState }, loadedState.courses));
      setSyncStatus('saved');
      setTimeout(syncTrack, 0);
      identify(userId);
    } catch (e) {
      logError('loadAll', e);
      // Fall back to a minimal signed-in user so the app is still usable.
      setState((s) => ({
        ...s,
        user: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.email ? authUser.email.split('@')[0] : 'Student',
          role: 'user',
        },
      }));
    }
  }, []);

  // Analytics provider (a no-op until a key is configured).
  useEffect(() => { initAnalytics(); }, []);

  // Hydrate local (theme + demo) then wire Supabase auth lifecycle.
  useEffect(() => {
    let hydrated = defaultState;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) hydrated = { ...defaultState, ...JSON.parse(raw) };
      // Stored state predates the seeded papers, so merge them back in.
      const storedIds = new Set((hydrated.pastPapers || []).map((p) => p.id));
      hydrated.pastPapers = [
        ...(hydrated.pastPapers || []),
        ...SEED_PAST_PAPERS.filter((p) => !storedIds.has(p.id)),
      ];
    } catch (err) { logError('hydrate', err); }

    // Never keep a stale user from a previous session until Supabase
    // confirms the session. (A leftover demo user from the old demo mode is
    // dropped the same way and its local data is not migrated.)
    const fromDemo = !!(hydrated.user && hydrated.user.isDemo) || !!hydrated.fromDemo;
    setState({ ...hydrated, user: null, fromDemo });

    if (!isSupabaseConfigured) {
      setLoaded(true);
      return undefined;
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        bootstrappedRef.current = null;
        setSyncStatus('idle');
        setState((s) => ({ ...defaultState, theme: s.theme }));
        setLoaded(true);
        return;
      }
      if (session && session.user) {
        if (bootstrappedRef.current === session.user.id) { setLoaded(true); return; }
        bootstrappedRef.current = session.user.id;
        await bootstrapCore(session.user);
        setLoaded(true);
      } else {
        setLoaded(true);
      }
    });

    return () => { try { sub.subscription.unsubscribe(); } catch { /* noop */ } };
  }, [bootstrapCore]);

  // Persist to localStorage: always for demo (local-only) and as a fast cache
  // otherwise. Auth tokens are stored separately by supabase-js.
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (err) { logError('persist', err); }
  }, [state, loaded]);

  // Liquid glass: the slider sets blur + opacity; "off" makes every surface
  // solid. 50 reproduces the stock look exactly.
  useEffect(() => {
    const root = document.documentElement;
    const i = Math.max(0, Math.min(100, Number(state.settings?.glass ?? 50)));
    const dark = state.theme === 'dark';
    const base = dark ? 0.86 : 0.84;
    const alpha = i <= 50 ? base + ((50 - i) / 50) * (1 - base) : base - ((i - 50) / 50) * 0.26;
    const off = !!state.settings?.glassOff;
    root.style.setProperty('--glass-alpha', off ? '1' : alpha.toFixed(3));
    root.style.setProperty('--glass-alpha-strong', off ? '1' : Math.min(1, alpha + 0.1).toFixed(3));
    root.style.setProperty('--glass-blur', off ? '0px' : `${Math.round(30 * (i / 50) * 10) / 10}px`);
    root.classList.toggle('no-glass', off);
  }, [state.settings?.glass, state.settings?.glassOff, state.theme]);

  // Theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [state.theme]);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark', themeMode: 'manual' }));
  }, []);

  // "Follow system": mirror prefers-color-scheme while it is on.
  const setThemeMode = useCallback((mode) => {
    setState((s) => ({ ...s, themeMode: mode }));
  }, []);
  useEffect(() => {
    if (state.themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setState((s) => (s.theme === (mql.matches ? 'dark' : 'light') ? s : { ...s, theme: mql.matches ? 'dark' : 'light' }));
    apply();
    if (mql.addEventListener) mql.addEventListener('change', apply); else mql.addListener(apply);
    return () => { if (mql.removeEventListener) mql.removeEventListener('change', apply); else mql.removeListener(apply); };
  }, [state.themeMode]);

  // Functional update: the wizard calls addCourse immediately before this,
  // and a snapshot taken from stateRef would still be missing that course.
  const completeOnboarding = useCallback(({ examTrack, examDate, subjects, frequency, weeklyGoal }) => {
    const patch = (prev) => ({
      ...prev,
      user: { ...prev.user, examTrack: examTrack || prev.user?.examTrack, subjects: subjects || [] },
      settings: {
        ...prev.settings,
        examDate: examDate || prev.settings.examDate,
        frequency: frequency || prev.settings.frequency,
        weeklyGoal: typeof weeklyGoal === 'number' ? weeklyGoal : prev.settings.weeklyGoal,
      },
      onboardingDone: true,
    });
    setState(patch);
    // The saved rows only need profile + settings fields, which the patch
    // derives from its arguments, so a snapshot is fine here.
    const saved = patch(stateRef.current);
    bg(() => store.upsertProfile(uid(), { examTrack: saved.user?.examTrack, subjects: saved.user?.subjects || [] }), 'onboarding/profile');
    bg(() => store.upsertSettings(saved, uid()), 'onboarding/settings');
  }, []);

  const restartOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboardingDone: false }));
    bg(() => store.upsertSettings({ ...stateRef.current, onboardingDone: false }, uid()), 'restartOnboarding');
  }, []);

  // Legacy local helpers kept for API compatibility (used nowhere critical).
  const signup = useCallback((user) => setState((s) => ({ ...s, user })), []);
  const login = useCallback((email) => {
    setState((s) => (s.user && s.user.email === email ? s : { ...s, user: s.user || { name: email.split('@')[0], email, examTrack: 'CBSE' } }));
  }, []);
  const logout = useCallback(() => setState((s) => ({ ...s, user: null })), []);

  // ---- Supabase auth ------------------------------------------------------
  const apiRegister = useCallback(async ({ email, password, name, examTrack, subjects }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: name || '' }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    if (!data.session) {
      const e = new Error('Almost there — check your email to confirm your account, then log in.');
      e.code = 'email_confirmation_required';
      throw e;
    }
    const authUser = data.user;
    bootstrappedRef.current = authUser.id;
    try {
      // email is owned by auth (a trigger rejects client-side changes), so it is not sent here.
      await store.upsertProfile(authUser.id, { name, examTrack, subjects: subjects || [] });
    } catch (e) { logError('register/profile', e); }
    await bootstrapCore(authUser);
    setLoaded(true);
    return { id: authUser.id, email: authUser.email, name };
  }, [bootstrapCore]);

  const apiLogin = useCallback(async ({ email, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) throw error;
    const authUser = data.user;
    bootstrappedRef.current = authUser.id;
    await bootstrapCore(authUser);
    setLoaded(true);
    return { id: authUser.id, email: authUser.email };
  }, [bootstrapCore]);

  // Google OAuth (redirect flow). Requires the Google provider to be enabled
  // in the Supabase dashboard. Returns after kicking off the redirect.
  const apiGoogleAuth = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  }, []);

  const apiLogout = useCallback(async () => {
    try { await supabase.auth.signOut({ scope: 'local' }); }
    catch (e) { logError('logout', e); }
    bootstrappedRef.current = null;
    setSyncStatus('idle');
    setState((s) => ({ ...defaultState, theme: s.theme }));
  }, []);

  // These mutators patch state functionally. Replacing the whole state with
  // a snapshot from stateRef silently dropped any update React had not
  // flushed yet (e.g. the course the wizard added a moment earlier).
  const updateProfile = useCallback((patch) => {
    setState((s) => ({ ...s, user: { ...s.user, ...patch } }));
    bg(() => store.upsertProfile(uid(), patch), 'updateProfile');
  }, []);

  const updateSettings = useCallback((patch) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    const forRow = { ...stateRef.current, settings: { ...stateRef.current.settings, ...patch } };
    bg(() => store.upsertSettings(forRow, uid()), 'updateSettings');
  }, []);

  const resetProgress = useCallback(() => {
    const cleared = { worksheets: [], mistakes: [], streak: 0, questionsToday: 0, goalDate: null, lastStudyDate: null };
    setState((s) => ({ ...s, ...cleared }));
    bg(() => store.clearProgress(uid()), 'resetProgress/clear');
    bg(() => store.upsertSettings({ ...stateRef.current, ...cleared }, uid()), 'resetProgress/settings');
  }, []);

  // Real accounts are deleted server-side first (auth row + every owned row
  // via cascade); the device copy is cleared either way.
  const deleteAccount = useCallback(async () => {
    const wasReal = canSync();
    if (wasReal) {
      try { await store.deleteOwnAccount(); }
      catch (e) { logError('deleteAccount/server', e); throw e; }
      supabase.auth.signOut({ scope: 'local' }).catch((e) => logError('deleteAccount/signout', e));
    }
    bootstrappedRef.current = null;
    setState(defaultState);
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { logError('deleteAccount', err); }
  }, []);

  // Pure computation of the next state + new mistakes for a finished worksheet.
  const computeWorksheet = (prev, sheet) => {
    const today = new Date().toDateString();
    const lastDate = prev.lastStudyDate;
    let streak = prev.streak || 0;
    if (lastDate !== today) {
      if (lastDate) {
        const diffDays = Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak += 1;
        else if (diffDays > 1) streak = 1;
      } else {
        streak = 1;
      }
    }
    const goalDate = today;
    const questionsToday = (prev.goalDate === today ? prev.questionsToday : 0) + sheet.total;
    const newMistakes = (sheet.questions || []).map((q, i) => {
      const wrong = Array.isArray(sheet.results) ? sheet.results[i] === false : sheet.answers[i] !== q.a;
      if (!wrong) return null;
      return {
        id: `${sheet.id}-${i}`,
        worksheetId: sheet.id,
        subject: sheet.subject,
        topic: q._topic || sheet.topic,
        question: q.q,
        options: q.options || null,
        correct: q.a,
        given: sheet.answers[i],
        answerType: q.answerType || sheet.answerType || 'Multiple choice',
        typedAnswer: q.typedAnswer || null,
        examKeywords: q.examKeywords || null,
        date: sheet.date,
      };
    }).filter(Boolean);
    const next = {
      ...prev,
      worksheets: [sheet, ...prev.worksheets],
      mistakes: [...newMistakes, ...prev.mistakes].slice(0, 200),
      streak,
      lastStudyDate: today,
      questionsToday,
      goalDate,
    };
    return { next, newMistakes };
  };

  const recordWorksheet = useCallback((sheet) => {
    const { next, newMistakes } = computeWorksheet(stateRef.current, sheet);
    // Completing a worksheet clears any saved in-progress draft.
    setState({ ...next, draftWorksheet: null });
    track('worksheet_completed', { subject: sheet.subject, score: sheet.score, total: sheet.total, difficulty: sheet.difficulty, answerType: sheet.answerType, examMode: !!sheet.examMode, simulation: !!sheet.simulation, paper: !!sheet.paper });
    bg(() => store.upsertWorksheet(sheet, uid()), 'recordWorksheet/sheet');
    bg(() => store.upsertMistakes(newMistakes, uid()), 'recordWorksheet/mistakes');
    bg(() => store.upsertSettings(next, uid()), 'recordWorksheet/settings');
  }, []);

  // Patch a finished worksheet (e.g. attach its AI diagnosis) and sync it.
  const updateWorksheet = useCallback((id, patch) => {
    const cur = (stateRef.current.worksheets || []).find((w) => w.id === id);
    if (!cur) return;
    const merged = { ...cur, ...patch };
    setState((s) => ({ ...s, worksheets: (s.worksheets || []).map((w) => (w.id === id ? merged : w)) }));
    bg(() => store.upsertWorksheet(merged, uid()), 'updateWorksheet');
  }, []);

  // Save / update the in-progress worksheet draft (local only — never synced).
  const saveDraftWorksheet = useCallback((draft) => {
    setState((s) => ({ ...s, draftWorksheet: draft }));
  }, []);
  const clearDraftWorksheet = useCallback(() => {
    setState((s) => (s.draftWorksheet ? { ...s, draftWorksheet: null } : s));
  }, []);

  const removeMistake = useCallback((id) => {
    setState((s) => ({ ...s, mistakes: s.mistakes.filter((m) => m.id !== id) }));
    bg(() => store.deleteMistake(id, uid()), 'removeMistake');
  }, []);

  const finishTutorial = useCallback(() => {
    setState((s) => ({ ...s, tutorialDone: true }));
    bg(() => store.upsertSettings({ ...stateRef.current, tutorialDone: true }, uid()), 'finishTutorial');
  }, []);
  const restartTutorial = useCallback(() => {
    setState((s) => ({ ...s, tutorialDone: false }));
    bg(() => store.upsertSettings({ ...stateRef.current, tutorialDone: false }, uid()), 'restartTutorial');
  }, []);

  // The account's exam track follows the courses: the most common board
  // wins, so an IB-only student never sees the onboarding default (CBSE)
  // as a fallback anywhere.
  const withTrack = (s, courses) => {
    if (!s.user) return s;
    const track = primaryTrack(courses, s.user.examTrack);
    return track === s.user.examTrack ? s : { ...s, user: { ...s.user, examTrack: track } };
  };
  const syncTrack = () => {
    const u = stateRef.current.user;
    const track = primaryTrack(stateRef.current.courses, u?.examTrack);
    if (u && track !== u.examTrack) bg(() => store.upsertProfile(uid(), { examTrack: track }), 'syncTrack');
  };

  const addCourse = useCallback((course) => {
    const full = { id: `c_${Date.now()}`, addedAt: new Date().toISOString(), ...course };
    setState((s) => withTrack({ ...s, courses: [full, ...s.courses] }, [full, ...s.courses]));
    bg(() => store.upsertCourse(full, uid()), 'addCourse');
    setTimeout(syncTrack, 0);
  }, []);
  // Subjects the student still has after a course changes. Keeps
  // `user.subjects` (the fallback list) from resurrecting deleted subjects.
  const subjectsStillTaken = (courses, userSubjects) => {
    const inCourses = new Set();
    (courses || []).forEach((c) => {
      const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
      subs.forEach((e) => { const n = typeof e === 'string' ? e : e?.subject; if (n) inCourses.add(n); });
    });
    // No courses left -> nothing to reconcile against; keep what they had.
    if (inCourses.size === 0) return [];
    return (userSubjects || []).filter((n) => inCourses.has(n));
  };

  const removeCourse = useCallback((id) => {
    setState((s) => {
      const courses = s.courses.filter((c) => c.id !== id);
      return withTrack({ ...s, courses, user: s.user ? { ...s.user, subjects: subjectsStillTaken(courses, s.user.subjects) } : s.user }, courses);
    });
    bg(() => store.deleteCourse(id, uid()), 'removeCourse');
    setTimeout(syncTrack, 0);
  }, []);
  const updateCourse = useCallback((id, patch) => {
    let updated = null;
    setState((s) => {
      const courses = s.courses.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch };
        return updated;
      });
      // Dropping a subject from a course drops it from the fallback list too.
      const user = s.user && patch && patch.subjects
        ? { ...s.user, subjects: subjectsStillTaken(courses, s.user.subjects) }
        : s.user;
      return withTrack({ ...s, courses, user }, courses);
    });
    bg(() => updated && store.upsertCourse(updated, uid()), 'updateCourse');
    setTimeout(syncTrack, 0);
  }, []);

  // Fabricate a realistic body of study data (Admin -> "Create test performance").
  const seedTestPerformance = useCallback(() => {
    const prev = stateRef.current;
    const track = prev.user?.examTrack || 'CBSE';
    // Same source of truth as Start Studying / the Dashboard: the student's
    // courses first, then their onboarding picks. Deleting a subject or course
    // therefore removes it from seeded performance too.
    const enrolled = enrolledSubjects(prev.courses, prev.user?.subjects, track);
    const subs = enrolled.length > 0 ? enrolled : ['Mathematics', 'Physics', 'Chemistry'];
    const DIFFS = ['Easy', 'Medium', 'Exam level', 'Hard'];
    const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const worksheets = [];
    const mistakes = [];
    let totalQuestionsToday = 0;
    const today = new Date().toISOString().slice(0, 10);

    subs.forEach((subject) => {
      const topics = TOPICS[subject] && TOPICS[subject].length > 0 ? TOPICS[subject] : ['General'];
      for (let i = 0; i < 9; i++) {
        const total = pick([5, 8, 10, 10, 12]);
        const score = Math.max(20, Math.min(100, Math.round(45 + Math.random() * 55)));
        const correct = Math.round((score / 100) * total);
        const daysBack = (8 - i) * 4 + randInt(0, 3);
        const dt = new Date();
        dt.setDate(dt.getDate() - daysBack);
        const sheetTopics = [pick(topics)];
        if (Math.random() < 0.35 && topics.length > 1) {
          const extra = pick(topics.filter((t) => t !== sheetTopics[0]));
          if (extra) sheetTopics.push(extra);
        }
        const questions = Array.from({ length: total }).map((_, qi) => {
          const t = sheetTopics[qi % sheetTopics.length] || sheetTopics[0];
          return { id: `q_${subject}_${i}_${qi}`, subject, topic: t, _topic: t, q: `Sample question ${qi + 1} for ${t}.`, options: ['Option A', 'Option B', 'Option C', 'Option D'], a: 0, answerType: 'Multiple choice' };
        });
        const answers = questions.map((_, qi) => (qi < correct ? 0 : 1));
        const results = questions.map((_, qi) => qi < correct);
        const sheetId = `seed_${subject.replace(/\W+/g, '_')}_${i}_${dt.getTime()}`;
        const sheet = { id: sheetId, subject, topic: sheetTopics.join(', '), topics: sheetTopics, difficulty: pick(DIFFS), length: total, answerType: 'Multiple choice', duration: 20, pastPapers: false, aiGenerated: true, questions, answers, results, total, correct, score, durationSec: randInt(180, 900), date: dt.toISOString() };
        worksheets.push(sheet);
        for (let qi = correct; qi < total; qi++) {
          const q = questions[qi];
          mistakes.push({ id: `${sheetId}-${qi}`, worksheetId: sheetId, subject, topic: q._topic, question: q.q, options: q.options, correct: q.a, given: answers[qi], answerType: 'Multiple choice', typedAnswer: null, examKeywords: null, date: sheet.date });
        }
        if (dt.toISOString().slice(0, 10) === today) totalQuestionsToday += total;
      }
    });

    worksheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    mistakes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const trimmedMistakes = mistakes.slice(0, 200);

    const seeded = {
      worksheets,
      mistakes: trimmedMistakes,
      streak: Math.max(prev.streak || 0, 5),
      questionsToday: totalQuestionsToday,
      goalDate: today,
      lastStudyDate: today,
    };
    const next = { ...prev, ...seeded };
    setState((s) => ({ ...s, ...seeded }));
    bg(() => store.upsertWorksheets(worksheets, uid()), 'seed/worksheets');
    bg(() => store.upsertMistakes(trimmedMistakes, uid()), 'seed/mistakes');
    bg(() => store.upsertSettings(next, uid()), 'seed/settings');
  }, []);


  // ---- past papers --------------------------------------------------------
  const refreshPastPapers = useCallback(async () => {
    try {
      const list = await store.listPastPapers();
      // Seeded papers ship with the repo so the worksheet builder always has
      // past-paper content; database rows are layered on top of them.
      const remote = Array.isArray(list) ? list : [];
      const remoteIds = new Set(remote.map((p) => p.id));
      const merged = [...remote, ...SEED_PAST_PAPERS.filter((p) => !remoteIds.has(p.id))];
      setState((s) => ({ ...s, pastPapers: merged }));
      return list;
    } catch (err) { logError('past-papers/list', err); return null; }
  }, []);

  const addPastPaper = useCallback(async (pp) => {
    const tempId = `pp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimistic = { id: tempId, addedAt: new Date().toISOString(), source: 'past-paper', ...pp };
    setState((s) => ({ ...s, pastPapers: [optimistic, ...(s.pastPapers || [])] }));
    // Demo / offline admins keep their questions on this device; only a
    // signed-in admin writes to Supabase (RLS rejects anyone else anyway).
    if (!canSync()) return optimistic;
    try {
      const saved = await store.createPastPaper(pp);
      setState((s) => ({ ...s, pastPapers: (s.pastPapers || []).map((p) => (p.id === tempId ? saved : p)) }));
      return saved;
    } catch (err) {
      logError('past-papers/create', err);
      setState((s) => ({ ...s, pastPapers: (s.pastPapers || []).filter((p) => p.id !== tempId) }));
      throw err;
    }
  }, []);

  const removePastPaper = useCallback(async (id) => {
    const before = stateRef.current.pastPapers || [];
    setState((s) => ({ ...s, pastPapers: (s.pastPapers || []).filter((p) => p.id !== id) }));
    if (!canSync()) return;
    try {
      await store.deletePastPaper(id);
    } catch (err) {
      logError('past-papers/delete', err);
      setState((s) => ({ ...s, pastPapers: before }));
      throw err;
    }
  }, []);

  // ---- next wave ----------------------------------------------------------
  // Badges: recomputed from state whenever progress changes; new unlocks are
  // stamped with a date, toasted, and saved with the settings row.
  useEffect(() => {
    if (!loaded || !state.user) return;
    const unlocked = computeBadges(state);
    const fresh = Object.keys(unlocked).filter((id) => !state.badges?.[id]);
    if (!fresh.length) return;
    const stamp = new Date().toISOString();
    const badges = { ...(state.badges || {}) };
    fresh.forEach((id) => { badges[id] = stamp; });
    setState((s) => ({ ...s, badges }));
    fresh.forEach((id) => {
      const b = BADGES.find((x) => x.id === id);
      if (b) toast.success(`${b.emoji} Badge unlocked: ${b.name}`, { description: b.how });
      track('badge_unlocked', { badge: id });
    });
    bg(() => store.upsertSettings({ ...stateRef.current, badges }, uid()), 'badges');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.worksheets, state.streak, state.flashcards?.reviewed]);

  const saveFlashcardExplanation = useCallback((key, text) => {
    setState((s) => {
      const cur = s.flashcards || { cards: {}, reviewed: 0 };
      return { ...s, flashcards: { ...cur, explanations: { ...(cur.explanations || {}), [key]: text } } };
    });
    bg(() => store.upsertSettings(stateRef.current, uid()), 'flashcards/explain');
  }, []);

  // "I knew it" / "I didn't know it" on one card.
  const markFlashcard = useCallback((key, knew) => {
    setState((s) => {
      const cur = s.flashcards || { cards: {}, reviewed: 0 };
      const cards = { ...(cur.cards || {}), [key]: markCard(cur.cards?.[key], knew) };
      return { ...s, flashcards: { ...cur, cards, reviewed: (cur.reviewed || 0) + 1 } };
    });
    bg(() => store.upsertSettings(stateRef.current, uid()), 'flashcards');
  }, []);

  // Concept deck the AI wrote for a topic — kept for good.
  const saveFlashcardDeck = useCallback((subject, topic, cards) => {
    setState((s) => {
      const cur = s.flashcards || { cards: {}, reviewed: 0 };
      return { ...s, flashcards: { ...cur, decks: { ...(cur.decks || {}), [`${subject}|${topic}`]: { cards, createdAt: new Date().toISOString() } } } };
    });
    bg(() => store.upsertSettings(stateRef.current, uid()), 'flashcards/deck');
  }, []);

  const setStudyPlan = useCallback((plan) => {
    setState((s) => ({ ...s, studyPlan: plan }));
    bg(() => store.upsertSettings({ ...stateRef.current, studyPlan: plan }, uid()), 'studyPlan');
  }, []);
  const togglePlanTask = useCallback((dayIdx, taskIdx) => {
    let next = null;
    setState((s) => {
      if (!s.studyPlan) return s;
      const days = s.studyPlan.days.map((d, i) => (i !== dayIdx ? d : { ...d, tasks: d.tasks.map((t, j) => (j !== taskIdx ? t : { ...t, done: !t.done })) }));
      next = { ...s.studyPlan, days };
      return { ...s, studyPlan: next };
    });
    bg(() => next && store.upsertSettings({ ...stateRef.current, studyPlan: next }, uid()), 'studyPlan/toggle');
  }, []);

  // Why a question was missed: stored on the sheet (reasons[i]) and on the
  // matching mistake row so Strengths can split knowledge vs technique.
  const tagMistakeReason = useCallback((sheetId, i, reason) => {
    let sheet = null;
    let mistake = null;
    setState((s) => {
      const worksheets = (s.worksheets || []).map((w) => {
        if (w.id !== sheetId) return w;
        const reasons = { ...(w.reasons || {}) };
        if (reason) reasons[i] = reason; else delete reasons[i];
        sheet = { ...w, reasons };
        return sheet;
      });
      const mid = `${sheetId}-${i}`;
      const mistakes = (s.mistakes || []).map((m) => {
        if (m.id !== mid) return m;
        mistake = { ...m, reason: reason || null };
        return mistake;
      });
      return { ...s, worksheets, mistakes };
    });
    bg(() => sheet && store.upsertWorksheet(sheet, uid()), 'tagReason/sheet');
    bg(() => mistake && store.upsertMistakes([mistake], uid()), 'tagReason/mistake');
  }, []);

  // Consent gate: age band + AI choice. Under-13 without a parent's OK
  // forces the AI off; the student can revisit this in Settings.
  const recordConsent = useCallback(({ ageBand, aiConsent, parentConsent }) => {
    const consent = { ageBand, aiConsent: !!aiConsent, parentConsent, at: new Date().toISOString() };
    setState((s) => ({ ...s, consent, settings: { ...s.settings, aiEnabled: !!aiConsent } }));
    bg(() => store.upsertSettings({ ...stateRef.current, consent, settings: { ...stateRef.current.settings, aiEnabled: !!aiConsent } }, uid()), 'consent');
  }, []);

  const logFocusSession = useCallback((session) => {
    setState((s) => ({ ...s, focusSessions: [...(s.focusSessions || []).slice(-199), session] }));
    bg(() => store.upsertSettings(stateRef.current, uid()), 'focus');
  }, []);

  const setSyllabusTopics = useCallback((rows) => {
    setState((s) => ({ ...s, syllabusTopics: rows }));
  }, []);

  const value = useMemo(() => ({
    state, loaded, syncStatus,
    signup, login, logout,
    apiRegister, apiLogin, apiGoogleAuth, apiLogout,
    updateProfile, updateSettings, resetProgress, seedTestPerformance, deleteAccount,
    recordWorksheet, removeMistake,
    saveDraftWorksheet, clearDraftWorksheet, updateWorksheet,
    finishTutorial, restartTutorial,
    addCourse, removeCourse, updateCourse,
    addPastPaper, removePastPaper, refreshPastPapers,
    toggleTheme, completeOnboarding, restartOnboarding,
    markFlashcard, saveFlashcardDeck, setStudyPlan, togglePlanTask, setSyllabusTopics, tagMistakeReason, recordConsent, logFocusSession, setThemeMode, saveFlashcardExplanation,
  }), [
    state, loaded, syncStatus,
    signup, login, logout,
    apiRegister, apiLogin, apiGoogleAuth, apiLogout,
    updateProfile, updateSettings, resetProgress, seedTestPerformance, deleteAccount,
    recordWorksheet, removeMistake,
    saveDraftWorksheet, clearDraftWorksheet, updateWorksheet,
    finishTutorial, restartTutorial,
    addCourse, removeCourse, updateCourse,
    addPastPaper, removePastPaper, refreshPastPapers,
    toggleTheme, completeOnboarding, restartOnboarding,
    markFlashcard, saveFlashcardDeck, setStudyPlan, togglePlanTask, setSyllabusTopics, tagMistakeReason, recordConsent, logFocusSession, setThemeMode, saveFlashcardExplanation,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
