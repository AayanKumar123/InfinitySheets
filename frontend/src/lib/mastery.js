// Topic mastery: a 0-100 score per (subject, topic) that blends accuracy
// with how much evidence there is and how recent it is, then a level label.
// Five questions at 100% is "Learning", not "Mastered" — mastery needs
// volume, accuracy and a recent correct run.

const DAY = 24 * 60 * 60 * 1000;

export const LEVELS = [
  { min: 0, key: 'new', label: 'Not started', cls: 'bg-slate-300' },
  { min: 1, key: 'novice', label: 'Novice', cls: 'bg-rose-400' },
  { min: 35, key: 'learning', label: 'Learning', cls: 'bg-amber-400' },
  { min: 60, key: 'solid', label: 'Solid', cls: 'bg-sky-400' },
  { min: 80, key: 'mastered', label: 'Mastered', cls: 'bg-emerald-500' },
];

export function levelFor(score) {
  let lv = LEVELS[0];
  for (const l of LEVELS) if (score >= l.min) lv = l;
  return lv;
}

/**
 * → Map key "subject|topic" → { subject, topic, score, level, n, accuracy,
 *   recentAccuracy, lastAt }
 */
export function computeMastery(worksheets = [], now = Date.now()) {
  const acc = new Map();
  (worksheets || []).forEach((w) => {
    if (!w || !w.subject) return;
    const at = new Date(w.date).getTime();
    (w.questions || []).forEach((q, i) => {
      const topic = q?._topic || q?.topic || w.topic;
      if (!topic) return;
      const key = `${w.subject}|${topic}`;
      const e = acc.get(key) || { subject: w.subject, topic, attempts: [] };
      const ok = Array.isArray(w.results) ? !!w.results[i] : (w.answers || [])[i] === q?.a;
      e.attempts.push({ at, ok });
      acc.set(key, e);
    });
  });
  const out = new Map();
  for (const [key, e] of acc) {
    e.attempts.sort((a, b) => a.at - b.at);
    const n = e.attempts.length;
    const right = e.attempts.filter((a) => a.ok).length;
    const accuracy = Math.round((right / n) * 100);
    const recent = e.attempts.slice(-10);
    const recentAccuracy = Math.round((recent.filter((a) => a.ok).length / recent.length) * 100);
    const lastAt = e.attempts[n - 1].at;
    // Evidence factor: 0 → 1 over ~25 questions. Recency: full weight for a
    // month, fading to 60% after ~3 months without practice.
    const evidence = 1 - Math.exp(-n / 12);
    const ageDays = (now - lastAt) / DAY;
    const recency = ageDays <= 30 ? 1 : Math.max(0.6, 1 - (ageDays - 30) / 150);
    const blended = 0.4 * accuracy + 0.6 * recentAccuracy;
    const score = Math.round(Math.max(1, blended * evidence * recency));
    out.set(key, { subject: e.subject, topic: e.topic, score, level: levelFor(score), n, accuracy, recentAccuracy, lastAt });
  }
  return out;
}

/** Mastery rows for one subject, including untouched topics at 0. */
export function masteryForSubject(mastery, subject, allTopics = []) {
  const rows = allTopics.map((t) => mastery.get(`${subject}|${t}`) || { subject, topic: t, score: 0, level: LEVELS[0], n: 0, accuracy: 0, recentAccuracy: 0, lastAt: 0 });
  // Topics seen in sheets but not in the canonical list still count.
  for (const [k, v] of mastery) if (v.subject === subject && !allTopics.includes(v.topic)) rows.push(v);
  return rows.sort((a, b) => b.score - a.score);
}

/** Subject-level summary: average score and the level breakdown. */
export function subjectMasterySummary(rows) {
  if (!rows.length) return { avg: 0, counts: {} };
  const counts = {};
  rows.forEach((r) => { counts[r.level.key] = (counts[r.level.key] || 0) + 1; });
  return { avg: Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length), counts };
}
