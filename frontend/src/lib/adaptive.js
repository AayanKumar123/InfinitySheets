// Adaptive difficulty: pick the next sheet's level from recent accuracy on
// the chosen topics, so a student who is coasting gets pushed and one who is
// drowning gets a foothold. Pure function — the builder shows the pick and
// the reason, the student can always override.

export const LEVELS = ['Easy', 'Medium', 'Exam level', 'Hard'];

const RECENT = 6;

export function topicAccuracy(worksheets = [], subject, topics = []) {
  const want = new Set(topics);
  let right = 0;
  let total = 0;
  const recent = [...worksheets].filter((w) => w && w.subject === subject && (w.total || 0) > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, RECENT);
  recent.forEach((w) => {
    (w.questions || []).forEach((q, i) => {
      const t = q?._topic || q?.topic || w.topic;
      if (want.size && !want.has(t)) return;
      total += 1;
      const ok = Array.isArray(w.results) ? !!w.results[i] : (w.answers || [])[i] === q?.a;
      if (ok) right += 1;
    });
  });
  return { accuracy: total ? Math.round((right / total) * 100) : null, sample: total, lastDifficulty: recent[0]?.difficulty || null };
}

/**
 * → { level, reason, accuracy, sample }. With fewer than 5 recent answers on
 * these topics it returns the student's default and says so.
 */
export function adaptiveDifficulty(worksheets, subject, topics, fallback = 'Medium') {
  const { accuracy, sample, lastDifficulty } = topicAccuracy(worksheets, subject, topics);
  if (accuracy === null || sample < 5) {
    return { level: fallback, reason: 'Not enough recent answers on these topics yet — starting at your default.', accuracy, sample };
  }
  const base = LEVELS.indexOf(LEVELS.includes(lastDifficulty) ? lastDifficulty : fallback);
  let idx = base;
  let reason;
  if (accuracy >= 85) { idx = Math.min(LEVELS.length - 1, base + 1); reason = `${accuracy}% on the last ${sample} questions — stepping up.`; }
  else if (accuracy < 55) { idx = Math.max(0, base - 1); reason = `${accuracy}% on the last ${sample} questions — easing off to rebuild the basics.`; }
  else { reason = `${accuracy}% on the last ${sample} questions — holding this level.`; }
  return { level: LEVELS[idx], reason, accuracy, sample };
}
