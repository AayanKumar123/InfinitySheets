// Supabase data access + mapping between the frontend (camelCase) state shape
// and the Postgres rows. A `data` jsonb column on the study tables lets the
// exact frontend object round-trip without loss, so the existing UI keeps
// working unchanged. Every function throws on error; callers log/surface it.
import { supabase } from './supabase';

const nowISO = () => new Date().toISOString();
const toISO = (d) => {
  if (!d) return nowISO();
  try { return new Date(d).toISOString(); } catch { return nowISO(); }
};

// ------------------------------- mappers -----------------------------------
export function sheetToRow(sheet, userId) {
  return {
    id: sheet.id,
    user_id: userId,
    subject: sheet.subject ?? null,
    topic: sheet.topic ?? null,
    score: sheet.score ?? null,
    total: sheet.total ?? null,
    correct: sheet.correct ?? null,
    answers: sheet.answers ?? null,
    questions: sheet.questions ?? null,
    difficulty: sheet.difficulty ?? null,
    answer_type: sheet.answerType ?? null,
    duration: sheet.duration ?? null,
    data: sheet,
    created_at: toISO(sheet.date),
  };
}
export function rowToSheet(row) {
  const b = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...b,
    id: row.id,
    subject: b.subject ?? row.subject,
    topic: b.topic ?? row.topic,
    total: b.total ?? row.total,
    correct: b.correct ?? row.correct,
    score: b.score ?? row.score,
    difficulty: b.difficulty ?? row.difficulty,
    answerType: b.answerType ?? row.answer_type,
    answers: b.answers ?? row.answers,
    questions: b.questions ?? row.questions,
    date: b.date || row.created_at,
  };
}

function stripWorksheetId(mistakeId) {
  const m = String(mistakeId || '').match(/^(.*)-\d+$/);
  return m ? m[1] : null;
}
export function mistakeToRow(m, userId) {
  return {
    id: m.id,
    user_id: userId,
    worksheet_id: m.worksheetId || stripWorksheetId(m.id),
    subject: m.subject ?? null,
    topic: m.topic ?? null,
    question: m.question ?? null,
    options: m.options ?? null,
    correct: m.correct ?? null,
    given: m.given ?? null,
    answer_type: m.answerType ?? null,
    data: m,
    created_at: toISO(m.date),
  };
}
export function rowToMistake(row) {
  const b = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...b,
    id: row.id,
    subject: b.subject ?? row.subject,
    topic: b.topic ?? row.topic,
    question: b.question ?? row.question,
    options: b.options ?? row.options,
    correct: b.correct ?? row.correct,
    given: b.given ?? row.given,
    answerType: b.answerType ?? row.answer_type,
    date: b.date || row.created_at,
  };
}

export function courseToRow(c, userId) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name ?? null,
    exam: c.exam ?? null,
    subjects: c.subjects ?? null,
    target: c.target ?? null,
    level: c.level ?? null,
    status: c.status ?? null,
    data: c,
    created_at: toISO(c.addedAt),
  };
}
export function rowToCourse(row) {
  const b = row.data && typeof row.data === 'object' ? row.data : {};
  return { ...b, id: row.id, addedAt: b.addedAt || row.created_at };
}

export function settingsToRow(state, userId) {
  const s = state.settings || {};
  return {
    user_id: userId,
    daily_goal: s.dailyGoal ?? 10,
    weekly_goal: s.weeklyGoal ?? 50,
    frequency: s.frequency ?? '3-4 per week',
    default_difficulty: s.defaultDifficulty ?? 'Medium',
    exam_date: s.examDate ?? null,
    sound: s.sound ?? true,
    keyboard_shortcuts: s.keyboardShortcuts ?? true,
    streak: state.streak ?? 0,
    last_study_date: state.lastStudyDate ?? null,
    questions_today: state.questionsToday ?? 0,
    goal_date: state.goalDate ?? null,
    onboarding_done: state.onboardingDone ?? false,
    tutorial_done: state.tutorialDone ?? false,
    updated_at: nowISO(),
  };
}
export function rowToSettingsState(row) {
  if (!row) return {};
  return {
    settings: {
      dailyGoal: row.daily_goal ?? 10,
      weeklyGoal: row.weekly_goal ?? 50,
      frequency: row.frequency ?? '3-4 per week',
      defaultDifficulty: row.default_difficulty ?? 'Medium',
      examDate: row.exam_date ?? '',
      sound: row.sound ?? true,
      keyboardShortcuts: row.keyboard_shortcuts ?? true,
    },
    streak: row.streak ?? 0,
    lastStudyDate: row.last_study_date ?? null,
    questionsToday: row.questions_today ?? 0,
    goalDate: row.goal_date ?? null,
    onboardingDone: row.onboarding_done ?? false,
    tutorialDone: row.tutorial_done ?? false,
  };
}

export function profileToUser(row, authUser) {
  return {
    id: (row && row.id) || authUser.id,
    email: (row && row.email) || authUser.email,
    name: (row && row.name) || (authUser.email ? authUser.email.split('@')[0] : 'Student'),
    role: (row && row.role) || 'user',
    examTrack: (row && row.exam_track) || null,
    subjects: (row && row.subjects) || [],
    isDemo: false,
  };
}

// ------------------------------- reads -------------------------------------
export async function loadAll(userId, authUser) {
  const [profileRes, settingsRes, wsRes, msRes, csRes, ppRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('worksheets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('mistakes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('courses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('past_papers').select('*').order('created_at', { ascending: false }),
  ]);

  const settingsState = rowToSettingsState(settingsRes.data);
  return {
    user: profileToUser(profileRes.data, authUser),
    worksheets: (wsRes.data || []).map(rowToSheet),
    mistakes: (msRes.data || []).map(rowToMistake),
    courses: (csRes.data || []).map(rowToCourse),
    pastPapers: (ppRes.data || []).map((r) => (r.data && typeof r.data === 'object' ? { ...r.data, id: r.id } : r)),
    ...settingsState,
  };
}

// ------------------------------- writes ------------------------------------
export async function upsertProfile(userId, patch) {
  const row = { id: userId };
  if ('name' in patch) row.name = patch.name;
  if ('examTrack' in patch) row.exam_track = patch.examTrack;
  if ('subjects' in patch) row.subjects = patch.subjects;
  if ('email' in patch) row.email = patch.email;
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertSettings(state, userId) {
  const { error } = await supabase.from('user_settings').upsert(settingsToRow(state, userId), { onConflict: 'user_id' });
  if (error) throw error;
}

export async function upsertWorksheet(sheet, userId) {
  const { error } = await supabase.from('worksheets').upsert(sheetToRow(sheet, userId), { onConflict: 'id' });
  if (error) throw error;
}
export async function upsertWorksheets(sheets, userId) {
  if (!sheets || !sheets.length) return;
  const { error } = await supabase.from('worksheets').upsert(sheets.map((s) => sheetToRow(s, userId)), { onConflict: 'id' });
  if (error) throw error;
}
export async function upsertMistakes(mistakes, userId) {
  if (!mistakes || !mistakes.length) return;
  const { error } = await supabase.from('mistakes').upsert(mistakes.map((m) => mistakeToRow(m, userId)), { onConflict: 'id' });
  if (error) throw error;
}
export async function deleteMistake(id, userId) {
  const { error } = await supabase.from('mistakes').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
export async function upsertCourse(course, userId) {
  const { error } = await supabase.from('courses').upsert(courseToRow(course, userId), { onConflict: 'id' });
  if (error) throw error;
}
export async function upsertCourses(courses, userId) {
  if (!courses || !courses.length) return;
  const { error } = await supabase.from('courses').upsert(courses.map((c) => courseToRow(c, userId)), { onConflict: 'id' });
  if (error) throw error;
}
export async function deleteCourse(id, userId) {
  const { error } = await supabase.from('courses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
export async function clearProgress(userId) {
  await supabase.from('worksheets').delete().eq('user_id', userId);
  await supabase.from('mistakes').delete().eq('user_id', userId);
}

export async function migrateLocal({ worksheets, mistakes, courses }, userId) {
  await upsertWorksheets(worksheets, userId);
  await upsertMistakes(mistakes, userId);
  await upsertCourses(courses, userId);
}

// past papers (read is fine for any authenticated user; writes require admin)
export async function listPastPapers() {
  const { data, error } = await supabase.from('past_papers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r) => (r.data && typeof r.data === 'object' ? { ...r.data, id: r.id } : r));
}

function ppToRow(pp) {
  const row = {
    subject: pp.subject ?? null,
    topic: pp.topic ?? null,
    difficulty: pp.difficulty ?? 'Medium',
    answer_type: pp.answerType ?? 'Multiple choice',
    q: pp.q ?? null,
    year: pp.year ?? null,
    board: pp.board ?? null,
    marks: pp.marks ?? null,
    link: pp.link ?? null,
    added_by: pp.addedBy ?? null,
    options: pp.options ?? null,
    a: typeof pp.a === 'number' ? pp.a : null,
    typed_answer: pp.typedAnswer ?? null,
    typed_aliases: pp.typedAliases ?? null,
    exam_answer: pp.examAnswer ?? null,
    exam_keywords: pp.examKeywords ?? null,
    source: 'past-paper',
    data: { ...pp, source: 'past-paper' },
  };
  if (pp.id) row.id = pp.id;
  return row;
}
export async function createPastPaper(pp) {
  const { data, error } = await supabase.from('past_papers').insert(ppToRow(pp)).select().single();
  if (error) throw error;
  return data.data && typeof data.data === 'object' ? { ...data.data, id: data.id } : data;
}
export async function deletePastPaper(id) {
  const { error } = await supabase.from('past_papers').delete().eq('id', id);
  if (error) throw error;
}
