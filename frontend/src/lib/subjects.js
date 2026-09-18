// Single source of truth for "the subjects a student is actually taking".
//
// Every surface that shows the student's subjects — the Dashboard "My
// subjects" grid, Start Studying, the Create-a-Worksheet picker and the
// Question Bank — MUST derive its list from `enrolledSubjects` so the lists
// stay identical. The list comes from the student's own courses first, then
// any onboarding selection, and only falls back to the exam track's default
// subjects when nothing has been chosen yet. It is intentionally NOT filtered
// against a single exam track, so a student mixing boards (e.g. CBSE
// Mathematics + IB Mathematics AA HL) sees every subject they added.

import { SUBJECTS, EXAM_TRACKS, TOPICS } from '../data/mock';
import { BOARD_TOPICS, boardSubject } from '../data/syllabi';

export const boardName = (id) => EXAM_TRACKS.find((t) => t.id === id)?.name || id;

// Variants of one examining body share resources and examiner notes:
// CBSE Class 10 (CBSE10) sits under CBSE, ISC under CISCE alongside ICSE.
export const boardFamily = (id) => ({ CBSE10: 'CBSE', ISC: 'ICSE' }[id] || id);

// The ordered, de-duplicated list of subject names the student is taking.
export function enrolledSubjects(courses, userSubjects, track) {
  const trackSubs = SUBJECTS[track] || [];
  const fromCourses = [];
  (courses || []).forEach((c) => {
    const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
    subs.forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.subject;
      if (name && !fromCourses.includes(name)) fromCourses.push(name);
    });
  });
  if (fromCourses.length) return fromCourses;
  // Onboarding picks, for accounts that have not built a course yet.
  const fromUser = (userSubjects || []).filter((s) => trackSubs.includes(s) || !trackSubs.length);
  return fromUser;
}

// The board that best describes the student right now: the most common
// board across their courses (first course wins a tie), else what they
// picked at onboarding. Used for every "fallback" so a student whose courses
// are all IB never sees the onboarding default (CBSE) anywhere.
export function primaryTrack(courses, fallback) {
  const counts = new Map();
  (courses || []).forEach((c) => { if (c?.exam) counts.set(c.exam, (counts.get(c.exam) || 0) + 1); });
  let best = null;
  for (const [board, n] of counts) if (!best || n > best.n) best = { board, n };
  return best ? best.board : (fallback || 'ASA');
}

// The board for one subject: its course's board, else the primary track.
export function boardFor(subject, courses, fallback) {
  return subjectBoards(courses, primaryTrack(courses, fallback))[subject]?.board || primaryTrack(courses, fallback);
}

// Map<subjectName, { board, ibLevel }> so each subject can show which board /
// IB level it belongs to. Courses carry their own `exam` board, so a student
// taking IGCSE Physics and IB Economics gets the right board on each subject.
export function subjectBoards(courses, fallbackTrack) {
  const map = {};
  (courses || []).forEach((c) => {
    const board = c.exam || fallbackTrack;
    const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
    subs.forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.subject;
      if (!name) return;
      if (!map[name]) map[name] = { board, ibLevel: typeof entry === 'object' ? entry?.ibLevel : undefined };
    });
  });
  return map;
}

// ---------------------------------------------------------------------------
// The ONE definition of "the past-paper questions for this subject".
//
// The Question Bank and the worksheet builder must show the same questions, so
// both call this instead of filtering `state.pastPapers` themselves. A row
// qualifies when it is a real question (not a full-paper link), belongs to the
// subject, and either carries no board or matches the board of the course this
// subject belongs to. The builder then narrows by topic / answer type on top.
// ---------------------------------------------------------------------------
export function questionsForSubject(pastPapers, subject, courses, fallbackTrack) {
  if (!subject) return [];
  const board = subjectBoards(courses, fallbackTrack)[subject]?.board || fallbackTrack;
  return (pastPapers || []).filter((p) =>
    p && p.q && p.subject === subject
    && p.answerType !== 'Full paper'
    && (!p.board || p.board === board));
}

// Which curricula actually teach a subject, in EXAM_TRACKS order. This is what
// keeps a subject filed under the right board: an IB-only subject can only be
// added to an IB course, and its card says "IB", never the account's default.
export function tracksOffering(subject) {
  return EXAM_TRACKS.map((t) => t.id).filter((id) => (SUBJECTS[id] || []).includes(subject));
}

// The board a subject should default to when the student adds it: their own
// track if that track teaches it, otherwise the first curriculum that does.
export function defaultBoardFor(subject, preferredTrack) {
  const offering = tracksOffering(subject);
  if (offering.length === 0) return preferredTrack;
  return offering.includes(preferredTrack) ? preferredTrack : offering[0];
}

/**
 * Worksheets that still belong to the student: only those in subjects
 * currently in their courses. When a subject is removed, its history stays
 * on disk (Worksheet History / Mistakes keep it) but it drops out of the
 * dashboard, predicted grades, performance, strengths and recommendations,
 * instead of lingering under the fallback exam board.
 */
export function activeWorksheets(worksheets, courses, userSubjects, track) {
  const enrolled = new Set(enrolledSubjects(courses, userSubjects, track));
  return (worksheets || []).filter((w) => enrolled.has(w.subject));
}

// Topics for a subject: an admin-imported syllabus (public.syllabus_topics)
// for the student's board wins over the built-in TOPICS map.
export function syllabusTopicNames(syllabusTopics, board, subject) {
  const rows = syllabusTopics || [];
  const row = rows.find((r) => r.subject === subject && r.board === board);
  return row ? (row.topics || []).map((t) => t.name).filter(Boolean) : null;
}

// The topics for a subject ON A GIVEN BOARD: the board's own syllabus file
// first (IGCSE Physics ≠ A Level Physics ≠ CBSE Physics), then the legacy
// name-keyed map, then nothing. Every topic list in the app comes through
// here or through syllabusTopicNames (admin-imported override).
export function topicsFor(board, subject) {
  const own = BOARD_TOPICS[board]?.[subject];
  if (own && own.length) return own;
  if (!board) {
    // No board known: first board that teaches the subject.
    for (const id of EXAM_TRACKS.map((t) => t.id)) {
      const t = BOARD_TOPICS[id]?.[subject];
      if (t && t.length) return t;
    }
  }
  return TOPICS[subject] || [];
}

// Admin override → board syllabus → legacy.
export function resolvedTopics(syllabusTopics, board, subject) {
  return syllabusTopicNames(syllabusTopics, board, subject) || topicsFor(board, subject);
}

// Topics grouped into chapters for the worksheet picker's collapsible
// dropdowns. Shape: [{ chapter, units: [topic name, ...] }].
//   1. An admin-imported syllabus can carry chapters on its rows.
//   2. A board syllabus file can define `chapters: [{ name, units }]` on a
//      subject; when present those become the dropdowns.
//   3. Otherwise every topic is a unit under a single "All topics" group, so
//      the picker still gives one collapsible list with select-all.
export function topicGroups(syllabusTopics, board, subject) {
  const rows = syllabusTopics || [];
  const imported = rows.find((r) => r.subject === subject && r.board === board);
  if (imported && Array.isArray(imported.chapters) && imported.chapters.length) {
    return imported.chapters
      .map((c) => ({ chapter: c.name || 'Topics', units: (c.units || []).map((u) => (typeof u === 'string' ? u : u?.name)).filter(Boolean) }))
      .filter((g) => g.units.length);
  }
  const subj = boardSubject(board, subject);
  if (subj && Array.isArray(subj.chapters) && subj.chapters.length) {
    return subj.chapters
      .map((c) => ({ chapter: c.name || 'Topics', units: (c.units || []).filter(Boolean) }))
      .filter((g) => g.units.length);
  }
  const flat = resolvedTopics(syllabusTopics, board, subject);
  return flat.length ? [{ chapter: 'All topics', units: flat }] : [];
}
