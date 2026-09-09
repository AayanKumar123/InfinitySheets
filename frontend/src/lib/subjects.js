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
