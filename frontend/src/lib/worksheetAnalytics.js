// Worksheet analysis: how a student worked through a sheet, not just what
// they scored. Built from per-question telemetry captured while the sheet is
// taken (time on each question with the tab visible, visits, answer changes,
// first answer) and stored on the worksheet record as `analytics`.
//
// Everything here is pure so it can run on a freshly finished sheet, on an
// old one from history, and in tests.

export const UNANSWERED = (v) => v === -1 || v === '' || v === undefined || v === null;

// A blank telemetry record for a sheet of `n` questions.
export function emptyTelemetry(n) {
  return {
    timeMs: new Array(n).fill(0),
    visits: new Array(n).fill(0),
    changes: new Array(n).fill(0),
    firstAnswer: new Array(n).fill(null),
    firstAnswerMs: new Array(n).fill(null),
    order: [],
    hiddenMs: 0,          // time the tab was hidden while the sheet was open
  };
}

export function fmtMs(ms) {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Turn raw telemetry into the stored analytics object.
 *   questions, answers, results — the finished sheet
 *   telemetry                   — from emptyTelemetry(), filled in while taking
 *   gradeOne(q, answer)         — the sheet's own grader, so "first answer was
 *                                 right" uses the same rules as the score
 *   durationMin                 — the time the sheet allowed
 */
export function computeAnalytics({ questions = [], answers = [], results = [], telemetry, gradeOne, durationMin }) {
  const n = questions.length;
  const t = telemetry || emptyTelemetry(n);
  const per = questions.map((q, i) => {
    const first = t.firstAnswer?.[i];
    const hadFirst = first !== null && first !== undefined && !UNANSWERED(first);
    return {
      i,
      topic: q._topic || q.topic || null,
      timeMs: Math.max(0, Math.round(t.timeMs?.[i] || 0)),
      visits: t.visits?.[i] || 0,
      changes: t.changes?.[i] || 0,
      firstAnswerMs: t.firstAnswerMs?.[i] ?? null,
      answered: !UNANSWERED(answers[i]),
      correct: !!results[i],
      firstCorrect: hadFirst && typeof gradeOne === 'function' ? !!gradeOne(q, first) : null,
      changedFromFirst: hadFirst && first !== answers[i],
    };
  });

  const times = per.map((p) => p.timeMs);
  const totalActiveMs = times.reduce((a, b) => a + b, 0);
  const avgMs = avg(times);
  const correctTimes = per.filter((p) => p.correct).map((p) => p.timeMs);
  const wrongTimes = per.filter((p) => p.answered && !p.correct).map((p) => p.timeMs);

  const half = Math.floor(n / 2);
  const firstHalf = per.slice(0, half);
  const secondHalf = per.slice(half);
  const acc = (xs) => (xs.length ? xs.filter((p) => p.correct).length / xs.length : 0);

  const changed = per.filter((p) => p.changedFromFirst);
  const allottedMs = (durationMin || 0) * 60 * 1000;

  return {
    version: 1,
    perQuestion: per,
    totalActiveMs,
    avgMs,
    medianMs: median(times),
    maxMs: times.length ? Math.max(...times) : 0,
    minMs: times.length ? Math.min(...times) : 0,
    avgCorrectMs: avg(correctTimes),
    avgWrongMs: avg(wrongTimes),
    unanswered: per.filter((p) => !p.answered).length,
    revisited: per.filter((p) => p.visits > 1).length,
    changedCount: changed.length,
    changedRightToWrong: changed.filter((p) => p.firstCorrect === true && !p.correct).length,
    changedWrongToRight: changed.filter((p) => p.firstCorrect === false && p.correct).length,
    pace: {
      firstHalfAvgMs: avg(firstHalf.map((p) => p.timeMs)),
      secondHalfAvgMs: avg(secondHalf.map((p) => p.timeMs)),
      firstHalfAccuracy: acc(firstHalf),
      secondHalfAccuracy: acc(secondHalf),
    },
    allottedMs,
    expectedMsPerQuestion: n ? allottedMs / n : 0,
    usedFraction: allottedMs ? Math.min(1, totalActiveMs / allottedMs) : null,
    hiddenMs: t.hiddenMs || 0,
    order: t.order || [],
  };
}

/**
 * Plain-language observations, most important first. Each is
 * { tone: 'good' | 'warn' | 'info', text }.
 */
export function analyticsInsights(a) {
  if (!a || !a.perQuestion?.length) return [];
  const out = [];
  const n = a.perQuestion.length;
  const q = (p) => `Q${p.i + 1}`;
  const list = (ps) => ps.map(q).join(', ').replace(/, ([^,]*)$/, ' and $1');

  // Slow and still wrong → understanding gap, not a slip.
  const slowWrong = a.perQuestion.filter((p) => p.answered && !p.correct && a.avgMs > 0 && p.timeMs >= Math.max(2 * a.avgMs, 45000));
  if (slowWrong.length) {
    const worst = slowWrong.reduce((m, p) => (p.timeMs > m.timeMs ? p : m));
    out.push({ tone: 'warn', text: `You spent ${fmtMs(worst.timeMs)} on ${q(worst)} — ${(worst.timeMs / a.avgMs).toFixed(1)}× your average — and still got it wrong. That reads as a gap in the topic${worst.topic ? ` (${worst.topic})` : ''}, not a careless slip.` });
  }

  // Fast and wrong → guessing / rushing.
  const fastWrong = a.perQuestion.filter((p) => p.answered && !p.correct && p.timeMs > 0 && p.timeMs <= Math.min(0.45 * a.avgMs, 12000));
  if (fastWrong.length >= 2) {
    out.push({ tone: 'warn', text: `${list(fastWrong)} took under ${fmtMs(Math.max(...fastWrong.map((p) => p.timeMs)))} each and all were wrong — that looks like guessing. Slowing down on those would have been cheap marks.` });
  } else if (fastWrong.length === 1) {
    out.push({ tone: 'warn', text: `${q(fastWrong[0])} took only ${fmtMs(fastWrong[0].timeMs)} and was wrong — worth a second look before moving on next time.` });
  }

  // Second-guessing.
  if (a.changedRightToWrong > 0) {
    out.push({ tone: 'warn', text: `You changed a right answer to a wrong one ${a.changedRightToWrong === 1 ? 'once' : `${a.changedRightToWrong} times`}. Your first instinct was better — only change an answer when you can say exactly why.` });
  }
  if (a.changedWrongToRight > 0) {
    out.push({ tone: 'good', text: `Changing your mind paid off ${a.changedWrongToRight === 1 ? 'once' : `${a.changedWrongToRight} times`} — you caught your own mistake${a.changedWrongToRight === 1 ? '' : 's'}.` });
  }

  // Pace.
  const { firstHalfAvgMs: f, secondHalfAvgMs: s, firstHalfAccuracy: fa, secondHalfAccuracy: sa } = a.pace;
  if (n >= 6 && f > 0 && s > 0) {
    if (s < f * 0.65 && sa < fa - 0.15) {
      out.push({ tone: 'warn', text: `You sped up a lot in the second half (${fmtMs(s)} a question vs ${fmtMs(f)}) and accuracy fell from ${Math.round(fa * 100)}% to ${Math.round(sa * 100)}%. Pace yourself — the last questions are worth the same marks as the first.` });
    } else if (s > f * 1.5) {
      out.push({ tone: 'info', text: `The second half took ${fmtMs(s)} a question against ${fmtMs(f)} in the first — either the questions got harder or fatigue set in. Note where it started.` });
    }
  }

  // Time budget.
  if (a.usedFraction !== null && a.allottedMs > 0) {
    if (a.usedFraction >= 0.98) {
      out.push({ tone: 'warn', text: `You used the whole ${fmtMs(a.allottedMs)}${a.unanswered ? ` and left ${a.unanswered} unanswered` : ''}. In the real exam that's ${fmtMs(a.expectedMsPerQuestion)} a question — practise hitting that.` });
    } else if (a.usedFraction < 0.4 && a.perQuestion.some((p) => !p.correct)) {
      out.push({ tone: 'info', text: `You finished with ${fmtMs(a.allottedMs - a.totalActiveMs)} to spare and still dropped marks. Use leftover time to re-read the ones you weren't sure about.` });
    }
  }

  // Revisits.
  const bounced = a.perQuestion.filter((p) => p.visits >= 3);
  if (bounced.length) {
    out.push({ tone: 'info', text: `You came back to ${list(bounced)} three or more times. Flagging and moving on is fine — just make sure you return with a plan, not a re-read.` });
  }

  if (a.unanswered > 0 && !(a.usedFraction >= 0.98)) {
    out.push({ tone: 'warn', text: `${a.unanswered} question${a.unanswered === 1 ? ' was' : 's were'} left blank with time remaining. A blank scores nothing; an attempt might.` });
  }

  // Positive close if nothing else fired.
  if (out.length === 0) {
    out.push({ tone: 'good', text: `Steady pacing and no second-guessing — ${fmtMs(a.avgMs)} a question with no wild swings. Keep that rhythm.` });
  }
  return out.slice(0, 5);
}

// Compact plain-text summary for the AI diagnosis prompt.
export function analyticsForPrompt(a) {
  if (!a || !a.perQuestion?.length) return '';
  const rows = a.perQuestion.map((p) =>
    `Q${p.i + 1}: ${fmtMs(p.timeMs)}${p.visits > 1 ? `, visited ${p.visits}x` : ''}${p.changedFromFirst ? `, changed answer${p.firstCorrect === true && !p.correct ? ' (right->wrong)' : p.firstCorrect === false && p.correct ? ' (wrong->right)' : ''}` : ''}${p.answered ? '' : ', unanswered'} — ${p.correct ? 'correct' : 'wrong'}`);
  const pace = a.pace.firstHalfAvgMs && a.pace.secondHalfAvgMs
    ? `First half ${fmtMs(a.pace.firstHalfAvgMs)}/question at ${Math.round(a.pace.firstHalfAccuracy * 100)}% accuracy; second half ${fmtMs(a.pace.secondHalfAvgMs)}/question at ${Math.round(a.pace.secondHalfAccuracy * 100)}%.`
    : '';
  return [
    `Timing: ${fmtMs(a.totalActiveMs)} active of ${fmtMs(a.allottedMs)} allowed (${fmtMs(a.expectedMsPerQuestion)} per question in the real exam). Average ${fmtMs(a.avgMs)} per question; wrong answers averaged ${fmtMs(a.avgWrongMs)}, right ones ${fmtMs(a.avgCorrectMs)}.`,
    pace,
    'Per question: ' + rows.join('; '),
  ].filter(Boolean).join('\n');
}
