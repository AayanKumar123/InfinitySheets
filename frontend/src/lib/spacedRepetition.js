// Spaced repetition of missed questions, derived entirely from worksheet
// history so it syncs for free and never drifts from what the student did.
//
// A question enters the queue the first time it is answered wrong. Each
// later correct attempt moves it up a stage and pushes the next review out
// (1 → 3 → 7 → 14 days); a wrong attempt drops it back to stage 0. After the
// last interval it graduates and leaves the queue.

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14];
const DAY = 24 * 60 * 60 * 1000;

export function questionKey(subject, q) {
  const text = (q?.q || '').toString().toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160);
  return `${subject || ''}|${text}`;
}

/**
 * Build the review queue from the worksheet list.
 * Returns items sorted by due date: { key, subject, topic, q (question
 * object), stage, due (ms), lastAttempt (ms), wrongCount, dueNow }.
 */
export function buildReviewQueue(worksheets = [], now = Date.now()) {
  const byKey = new Map();
  const sorted = [...worksheets].filter((w) => w && w.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const w of sorted) {
    const at = new Date(w.date).getTime();
    (w.questions || []).forEach((q, i) => {
      if (!q || !q.q) return;
      const key = questionKey(w.subject, q);
      const ok = Array.isArray(w.results) ? !!w.results[i] : (w.answers || [])[i] === q.a;
      let e = byKey.get(key);
      if (!e) {
        if (ok) return;                      // never missed → not tracked
        e = { key, subject: w.subject, topic: q._topic || q.topic || w.topic, q, stage: 0, lastAttempt: at, wrongCount: 1, graduated: false };
        byKey.set(key, e);
        return;
      }
      e.lastAttempt = at;
      e.q = q;
      if (ok) {
        e.stage += 1;
        if (e.stage >= REVIEW_INTERVALS_DAYS.length) e.graduated = true;
      } else {
        e.stage = 0;
        e.wrongCount += 1;
        e.graduated = false;
      }
    });
  }
  const items = [];
  for (const e of byKey.values()) {
    if (e.graduated) continue;
    const due = e.lastAttempt + REVIEW_INTERVALS_DAYS[Math.min(e.stage, REVIEW_INTERVALS_DAYS.length - 1)] * DAY;
    items.push({ ...e, due, dueNow: due <= now, overdueDays: Math.max(0, Math.floor((now - due) / DAY)) });
  }
  return items.sort((a, b) => a.due - b.due);
}

export function dueReviews(worksheets, { subject, now } = {}) {
  return buildReviewQueue(worksheets, now).filter((r) => r.dueNow && (!subject || r.subject === subject));
}

// Shape a queued question so it can sit in a worksheet next to fresh ones.
export function reviewToQuestion(r) {
  return { ...r.q, _topic: r.topic || r.q._topic, source: 'review', reviewStage: r.stage };
}
