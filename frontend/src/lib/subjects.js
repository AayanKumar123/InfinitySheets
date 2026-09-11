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

import { SUBJECTS, EXAM_TRACKS } from '../data/mock';

export const boardName = (id) => EXAM_TRACKS.find((t) => t.id === id)?.name || id;

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
  const fromUser = userSubjects || [];
  if (fromUser.length) return fromUser;
  return trackSubs;
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
