// "Today's 5": a small mixed sheet, the same for a student all day, drawn
// from their weakest topics across every subject. Deterministic per day so
// a refresh does not roll new topics; done-state comes from the worksheet
// list (a sheet tagged challenge: today's key).
import { computeMastery } from './mastery';

export function dayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

// Small seeded PRNG so the pick is stable for the day.
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Pick the challenge: { key, subject, topics[], count } or null when the
 * student has no subjects. Prefers the weakest topics; with no history,
 * rotates through the subject's topics by day.
 */
export function todaysChallenge({ worksheets = [], subjects = [], topicsFor, now = Date.now() }) {
  if (!subjects.length) return null;
  const key = dayKey(now);
  const rand = rng(key);
  const mastery = computeMastery(worksheets, now);
  const subject = subjects[Math.floor(rand() * subjects.length)];
  const all = topicsFor(subject) || [];
  if (!all.length) return null;
  const scored = all.map((t) => ({ t, s: mastery.get(`${subject}|${t}`)?.score ?? -1 }));
  const weak = scored.filter((x) => x.s >= 0).sort((a, b) => a.s - b.s).slice(0, 2).map((x) => x.t);
  const fresh = scored.filter((x) => x.s < 0).map((x) => x.t);
  const topics = [...weak];
  while (topics.length < 2 && fresh.length) topics.push(fresh.splice(Math.floor(rand() * fresh.length), 1)[0]);
  if (!topics.length) topics.push(all[Math.floor(rand() * all.length)]);
  return { key, subject, topics, count: 5 };
}

export function challengeDone(worksheets = [], key = dayKey()) {
  return (worksheets || []).find((w) => w?.challenge === key) || null;
}

/** Consecutive days (ending today or yesterday) with a completed challenge. */
export function challengeStreak(worksheets = [], now = Date.now()) {
  const days = new Set((worksheets || []).filter((w) => w?.challenge).map((w) => w.challenge));
  let streak = 0;
  let d = new Date(now);
  if (!days.has(dayKey(d.getTime()))) d = new Date(d.getTime() - 86400000);
  while (days.has(dayKey(d.getTime()))) { streak += 1; d = new Date(d.getTime() - 86400000); }
  return streak;
}
