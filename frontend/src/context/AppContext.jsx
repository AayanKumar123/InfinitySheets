/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { SUBJECTS, TOPICS } from '../data/mock';
import { SEED_PAST_PAPERS } from '../data/pastPapers';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as store from '../lib/dataStore';

// Study data now lives in Supabase (Postgres + RLS) when the user is signed in
// with a real account. Demo mode (user.isDemo) stays 100% local (localStorage,
// no network). Theme is always a local device preference.
const STORAGE_KEY = 'infinitysheets_state_v1';
const isProd = process.env.NODE_ENV === 'production';

function logError(scope, err) {
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.warn(`[AppContext:${scope}]`, err);
  }
}

const defaultState = {
  user: null, // { id, name, email, role, examTrack, subjects?, isDemo? }
  worksheets: [],
  mistakes: [],
  courses: [],
  pastPapers: SEED_PAST_PAPERS,
  streak: 0,
  lastStudyDate: null,
  tutorialDone: false,
  onboardingDone: false,
  theme: 'light',
  settings: {
    dailyGoal: 10,
    weeklyGoal: 50,
    frequency: '3-4 per week',
    defaultDifficulty: 'Medium',
    examDate: '',
    keyboardShortcuts: true,
    sound: true,
    aiEnabled: true,
  },
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

  const isDemoLocalRef = useRef(false);
  const bootstrappedRef = useRef(null);

  // Cloud-sync status for the header badge: idle | saving | saved | error | local
  const [syncStatus, setSyncStatus] = useState('idle');
  const pendingRef = useRef(0);

  // ---- sync helpers -------------------------------------------------------
  const canSync = () => {
    const u = stateRef.current.user;
    return !!(u && !u.isDemo && u.id && isSupabaseConfigured);
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
      const localHasData = local && !(local.user && local.user.isDemo) &&
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
      setState((s) => ({ ...defaultState, theme: s.theme, draftWorksheet: s.draftWorksheet, ...loadedState }));
      setSyncStatus('saved');
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
          isDemo: false,
        },
      }));
    }
  }, []);

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

    const demoLocal = !!(hydrated.user && hydrated.user.isDemo);
    isDemoLocalRef.current = demoLocal;
    // Never keep a stale real (non-demo) user from a previous session until
    // Supabase confirms the session; demo users stay as-is.
    if (demoLocal) {
      setState(hydrated);
      setLoaded(true);
    } else {
      setState({ ...hydrated, user: null });
    }

    if (!isSupabaseConfigured) {
      setLoaded(true);
      return undefined;
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isDemoLocalRef.current) return; // demo never touches Supabase
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

  // Theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [state.theme]);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const startDemo = useCallback(() => {
    isDemoLocalRef.current = true;
    setSyncStatus('local');
    setState((s) => ({
      ...s,
      user: { name: 'Demo Student', email: 'demo@infinitysheets.app', examTrack: 'CBSE', isDemo: true, subjects: [] },
      onboardingDone: true,
    }));
    setLoaded(true);
  }, []);

  const completeOnboarding = useCallback(({ examTrack, examDate, subjects, frequency, weeklyGoal }) => {
    const prev = stateRef.current;
    const next = {
      ...prev,
      user: { ...prev.user, examTrack: examTrack || prev.user?.examTrack, subjects: subjects || [] },
      settings: {
        ...prev.settings,
        examDate: examDate || prev.settings.examDate,
        frequency: frequency || prev.settings.frequency,
        weeklyGoal: typeof weeklyGoal === 'number' ? weeklyGoal : prev.settings.weeklyGoal,
      },
      onboardingDone: true,
    };
    setState(next);
    bg(() => store.upsertProfile(uid(), { examTrack: next.user.examTrack, subjects: next.user.subjects }), 'onboarding/profile');
    bg(() => store.upsertSettings(next, uid()), 'onboarding/settings');
  }, []);

  const restartOnboarding = useCallback(() => {
    const next = { ...stateRef.current, onboardingDone: false };
    setState(next);
    bg(() => store.upsertSettings(next, uid()), 'restartOnboarding');
  }, []);

  // Legacy local helpers kept for API compatibility (used nowhere critical).
  const signup = useCallback((user) => setState((s) => ({ ...s, user })), []);
  const login = useCallback((email) => {
    setState((s) => (s.user && s.user.email === email ? s : { ...s, user: s.user || { name: email.split('@')[0], email, examTrack: 'SSLC' } }));
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
    isDemoLocalRef.current = false;
    bootstrappedRef.current = authUser.id;
    try {
      await store.upsertProfile(authUser.id, { name, examTrack, subjects: subjects || [], email: cleanEmail });
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
    isDemoLocalRef.current = false;
    bootstrappedRef.current = authUser.id;
    await bootstrapCore(authUser);
    setLoaded(true);
    return { id: authUser.id, email: authUser.email };
  }, [bootstrapCore]);

  // Google OAuth (redirect flow). Requires the Google provider to be enabled
  // in the Supabase dashboard. Returns after kicking off the redirect.
  const apiGoogleAuth = useCallback(async () => {
    isDemoLocalRef.current = false;
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
    isDemoLocalRef.current = false;
    bootstrappedRef.current = null;
    setSyncStatus('idle');
    setState((s) => ({ ...defaultState, theme: s.theme }));
  }, []);

  const updateProfile = useCallback((patch) => {
    const next = { ...stateRef.current, user: { ...stateRef.current.user, ...patch } };
    setState(next);
    bg(() => store.upsertProfile(uid(), patch), 'updateProfile');
  }, []);

  const updateSettings = useCallback((patch) => {
    const next = { ...stateRef.current, settings: { ...stateRef.current.settings, ...patch } };
    setState(next);
    bg(() => store.upsertSettings(next, uid()), 'updateSettings');
  }, []);

  const resetProgress = useCallback(() => {
    const next = { ...stateRef.current, worksheets: [], mistakes: [], streak: 0, questionsToday: 0, goalDate: null, lastStudyDate: null };
    setState(next);
    bg(() => store.clearProgress(uid()), 'resetProgress/clear');
    bg(() => store.upsertSettings(next, uid()), 'resetProgress/settings');
  }, []);

  const deleteAccount = useCallback(() => {
    const wasReal = canSync();
    if (wasReal) { supabase.auth.signOut({ scope: 'local' }).catch((e) => logError('deleteAccount/signout', e)); }
    isDemoLocalRef.current = false;
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
    bg(() => store.upsertWorksheet(sheet, uid()), 'recordWorksheet/sheet');
    bg(() => store.upsertMistakes(newMistakes, uid()), 'recordWorksheet/mistakes');
    bg(() => store.upsertSettings(next, uid()), 'recordWorksheet/settings');
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
    const next = { ...stateRef.current, tutorialDone: true };
    setState(next);
    bg(() => store.upsertSettings(next, uid()), 'finishTutorial');
  }, []);
  const restartTutorial = useCallback(() => {
    const next = { ...stateRef.current, tutorialDone: false };
    setState(next);
    bg(() => store.upsertSettings(next, uid()), 'restartTutorial');
  }, []);

  const addCourse = useCallback((course) => {
    const full = { id: `c_${Date.now()}`, addedAt: new Date().toISOString(), ...course };
    setState((s) => ({ ...s, courses: [full, ...s.courses] }));
    bg(() => store.upsertCourse(full, uid()), 'addCourse');
  }, []);
  const removeCourse = useCallback((id) => {
    setState((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== id) }));
    bg(() => store.deleteCourse(id, uid()), 'removeCourse');
  }, []);
  const updateCourse = useCallback((id, patch) => {
    let updated = null;
    setState((s) => ({
      ...s,
      courses: s.courses.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch };
        return updated;
      }),
    }));
    bg(() => updated && store.upsertCourse(updated, uid()), 'updateCourse');
  }, []);

  // Fabricate a realistic body of study data (Admin -> "Create test performance").
  const seedTestPerformance = useCallback(() => {
    const prev = stateRef.current;
    const track = prev.user?.examTrack || 'CBSE';
    const userSubs = Array.isArray(prev.user?.subjects) && prev.user.subjects.length > 0
      ? prev.user.subjects : (SUBJECTS[track] || []);
    const subs = userSubs.length > 0 ? userSubs : ['Mathematics', 'Physics', 'Chemistry'];
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

    const next = {
      ...prev,
      worksheets,
      mistakes: trimmedMistakes,
      streak: Math.max(prev.streak || 0, 5),
      questionsToday: totalQuestionsToday,
      goalDate: today,
      lastStudyDate: today,
    };
    setState(next);
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
    try {
      await store.deletePastPaper(id);
    } catch (err) {
      logError('past-papers/delete', err);
      setState((s) => ({ ...s, pastPapers: before }));
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    state, loaded, syncStatus,
    signup, login, logout,
    apiRegister, apiLogin, apiGoogleAuth, apiLogout,
    updateProfile, updateSettings, resetProgress, seedTestPerformance, deleteAccount,
    recordWorksheet, removeMistake,
    saveDraftWorksheet, clearDraftWorksheet,
    finishTutorial, restartTutorial,
    addCourse, removeCourse, updateCourse,
    addPastPaper, removePastPaper, refreshPastPapers,
    toggleTheme, startDemo, completeOnboarding, restartOnboarding,
  }), [
    state, loaded, syncStatus,
    signup, login, logout,
    apiRegister, apiLogin, apiGoogleAuth, apiLogout,
    updateProfile, updateSettings, resetProgress, seedTestPerformance, deleteAccount,
    recordWorksheet, removeMistake,
    saveDraftWorksheet, clearDraftWorksheet,
    finishTutorial, restartTutorial,
    addCourse, removeCourse, updateCourse,
    addPastPaper, removePastPaper, refreshPastPapers,
    toggleTheme, startDemo, completeOnboarding, restartOnboarding,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
