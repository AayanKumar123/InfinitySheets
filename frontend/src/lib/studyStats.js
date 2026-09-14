// Pure helpers behind the Dashboard's weekly summary and streak heatmap, and
// the Performance page's timing trends. All derived from the worksheet list.

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * This week vs last week: sheets, questions, accuracy, pace, best / worst
 * topic. `now` is injectable for tests.
 */
export function weeklySummary(worksheets = [], now = Date.now()) {
  const inRange = (from, to) => worksheets.filter((w) => { const t = new Date(w.date).getTime(); return t >= from && t < to; });
  const thisWeek = inRange(now - 7 * DAY, now + 1);
  const lastWeek = inRange(now - 14 * DAY, now - 7 * DAY);

  const stats = (ws) => {
    const qs = ws.reduce((s, w) => s + (w.total || 0), 0);
    const correct = ws.reduce((s, w) => s + (w.correct || 0), 0);
    const paces = ws.filter((w) => w.analytics?.avgMs).map((w) => w.analytics.avgMs);
    const activeMs = ws.reduce((s, w) => s + (w.analytics?.totalActiveMs || (w.durationSec || 0) * 1000), 0);
    return { sheets: ws.length, questions: qs, accuracy: qs ? correct / qs : null, paceMs: avg(paces), activeMs };
  };
  const a = stats(thisWeek);
  const b = stats(lastWeek);

  // Topic accuracy this week vs last, for "most improved" / "weakest".
  const topicAcc = (ws) => {
    const m = {};
    ws.forEach((w) => (w.questions || []).forEach((q, i) => {
      const t = q._topic || q.topic || w.topic;
      if (!t) return;
      const ok = Array.isArray(w.results) ? !!w.results[i] : (w.answers || [])[i] === q.a;
      m[t] = m[t] || { n: 0, c: 0 };
      m[t].n += 1; if (ok) m[t].c += 1;
    }));
    return m;
  };
  const ta = topicAcc(thisWeek);
  const tb = topicAcc(lastWeek);
  let weakest = null;
  let improved = null;
  Object.entries(ta).forEach(([t, v]) => {
    if (v.n < 3) return;
    const acc = v.c / v.n;
    if (!weakest || acc < weakest.acc) weakest = { topic: t, acc, n: v.n };
    if (tb[t] && tb[t].n >= 3) {
      const delta = acc - tb[t].c / tb[t].n;
      if (delta > 0 && (!improved || delta > improved.delta)) improved = { topic: t, delta, acc };
    }
  });

  return {
    thisWeek: a,
    lastWeek: b,
    deltas: {
      sheets: a.sheets - b.sheets,
      questions: a.questions - b.questions,
      accuracy: a.accuracy !== null && b.accuracy !== null ? a.accuracy - b.accuracy : null,
      paceMs: a.paceMs !== null && b.paceMs !== null ? a.paceMs - b.paceMs : null,
    },
    weakest,
    improved,
    empty: a.sheets === 0,
  };
}

/**
 * Per-day activity for the last `weeks` weeks, oldest first, aligned so the
 * grid starts on a Sunday. Each cell: { date (Date), key, count, questions }.
 */
export function activityCalendar(worksheets = [], { weeks = 16, now = Date.now() } = {}) {
  const counts = {};
  worksheets.forEach((w) => {
    const k = dayKey(w.date);
    counts[k] = counts[k] || { count: 0, questions: 0 };
    counts[k].count += 1;
    counts[k].questions += w.total || 0;
  });
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY);
  start.setDate(start.getDate() - start.getDay());          // back to Sunday
  const days = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY)) {
    const k = dayKey(d);
    days.push({ date: d, key: k, count: counts[k]?.count || 0, questions: counts[k]?.questions || 0, future: false });
  }
  // Pad the final week so the grid is rectangular.
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1].date;
    const d = new Date(last.getTime() + DAY);
    days.push({ date: d, key: dayKey(d), count: 0, questions: 0, future: true });
  }
  const max = Math.max(1, ...days.map((d) => d.questions));
  const weeksOut = [];
  for (let i = 0; i < days.length; i += 7) weeksOut.push(days.slice(i, i + 7));
  const activeDays = days.filter((d) => d.count > 0).length;
  return { weeks: weeksOut, max, activeDays };
}

/**
 * Timing trends from worksheets that carry analytics.
 *   byTopic   — [{ topic, avgMs, accuracy, n }] sorted slowest first
 *   points    — [{ id, date, paceMs, accuracy, subject, topic }] for a scatter
 *   overTime  — [{ date, paceMs }] oldest first
 */
export function timingTrends(worksheets = [], { subject } = {}) {
  const ws = worksheets.filter((w) => w.analytics?.perQuestion?.length && (!subject || w.subject === subject));
  const topics = {};
  const points = [];
  ws.forEach((w) => {
    const a = w.analytics;
    points.push({ id: w.id, date: new Date(w.date).getTime(), paceMs: a.avgMs, accuracy: (w.score || 0) / 100, subject: w.subject, topic: w.topic, n: w.total });
    a.perQuestion.forEach((p) => {
      const t = p.topic || (w.questions?.[p.i]?._topic) || w.topic;
      if (!t) return;
      topics[t] = topics[t] || { topic: t, ms: 0, n: 0, c: 0 };
      topics[t].ms += p.timeMs; topics[t].n += 1; if (p.correct) topics[t].c += 1;
    });
  });
  const byTopic = Object.values(topics).filter((t) => t.n >= 2).map((t) => ({ topic: t.topic, avgMs: t.ms / t.n, accuracy: t.c / t.n, n: t.n })).sort((a, b) => b.avgMs - a.avgMs);
  const overTime = [...points].sort((a, b) => a.date - b.date).map((p) => ({ date: p.date, paceMs: p.paceMs, accuracy: p.accuracy }));
  return { byTopic, points, overTime, count: ws.length };
}

/**
 * Topics a student should study next in a subject, best first:
 * weakest attempted topics (accuracy < 65%, most recent weighting), then
 * topics never attempted. Returns [{ topic, reason, accuracy|null }].
 */
export function recommendedTopics(worksheets = [], subject, allTopics = [], { limit = 3, now = Date.now() } = {}) {
  const stats = {};
  worksheets.filter((w) => w.subject === subject).forEach((w) => {
    const age = Math.max(1, (now - new Date(w.date).getTime()) / DAY);
    const weight = 1 / Math.sqrt(age);          // recent sheets count more
    (w.questions || []).forEach((q, i) => {
      const t = q._topic || q.topic || w.topic;
      if (!t) return;
      const ok = Array.isArray(w.results) ? !!w.results[i] : (w.answers || [])[i] === q.a;
      stats[t] = stats[t] || { n: 0, c: 0, wn: 0, wc: 0 };
      stats[t].n += 1; stats[t].wn += weight;
      if (ok) { stats[t].c += 1; stats[t].wc += weight; }
    });
  });
  const weak = Object.entries(stats)
    .map(([topic, s]) => ({ topic, accuracy: s.wc / s.wn, n: s.n }))
    .filter((t) => t.n >= 2 && t.accuracy < 0.65)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((t) => ({ topic: t.topic, accuracy: t.accuracy, reason: `${Math.round(t.accuracy * 100)}% right` }));
  const untried = (allTopics || []).filter((t) => !stats[t]).map((t) => ({ topic: t, accuracy: null, reason: 'not attempted' }));
  return [...weak, ...untried].slice(0, limit);
}
