// "If you keep this up for 2 weeks you can get an A."
//
// Projects where a subject's predicted score lands if the student keeps the
// cadence and improvement of the last two weeks going. Deliberately
// conservative: improvement per sheet is measured from the student's own
// recent sheets, capped, and decays as the score approaches 100.
import { predictedScore, formatGrade, scoreToIBGrade, scoreToLetterGrade } from './predictedGrade';

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;

// The next grade boundary above `score` for a board, as { label, score }.
function nextBoundary(score, board) {
  const b = (board || '').toUpperCase();
  if (b === 'IB') {
    const cuts = [[85, '7'], [75, '6'], [65, '5'], [55, '4'], [45, '3'], [30, '2']];
    for (let i = cuts.length - 1; i >= 0; i--) if (score < cuts[i][0]) { /* keep going up */ }
    const above = cuts.filter(([s]) => s > score).sort((a, b2) => a[0] - b2[0])[0];
    return above ? { label: `${above[1]}/7`, score: above[0] } : null;
  }
  if (b === 'IGCSE' || b === 'ASA') {
    const cuts = [[90, 'A*'], [80, 'A'], [70, 'B'], [60, 'C'], [50, 'D'], [40, 'E']];
    const above = cuts.filter(([s]) => s > score).sort((a, b2) => a[0] - b2[0])[0];
    return above ? { label: above[1], score: above[0] } : null;
  }
  // Percentage boards: the next 10-point band.
  const next = Math.min(100, Math.floor(score / 10) * 10 + 10);
  return next > score ? { label: `${next}%`, score: next } : null;
}

function gradeLabel(score, board) {
  const b = (board || '').toUpperCase();
  if (b === 'IB') return `${scoreToIBGrade(score)}/7`;
  if (b === 'IGCSE' || b === 'ASA') return scoreToLetterGrade(score);
  return `${Math.round(score)}%`;
}

/**
 * projectStreak(worksheets, { subject, board, streak, now, weeks })
 * Returns null when there is not enough data (fewer than 2 sheets in the
 * subject), otherwise:
 *   { subject, board, current, projected, weeks, sheetsPerWeek, gainPerSheet,
 *     currentLabel, projectedLabel, nextBoundary, weeksToNext, message }
 */
export function projectStreak(worksheets = [], { subject, board, streak = 0, now = Date.now(), weeks = 2 } = {}) {
  const ws = worksheets.filter((w) => w.subject === subject && w.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (ws.length < 2) return null;

  const recent = ws.filter((w) => now - new Date(w.date).getTime() <= WINDOW_DAYS * DAY);
  const cadenceWindowDays = Math.max(7, Math.min(WINDOW_DAYS, (now - new Date(ws[0].date).getTime()) / DAY));
  const sheetsPerWeek = (recent.length || ws.length) / (cadenceWindowDays / 7);

  // Improvement per sheet: slope of score over the last few sheets.
  const tail = ws.slice(-6);
  let gainPerSheet = 0;
  if (tail.length >= 2) {
    const n = tail.length; const xs = tail.map((_, i) => i); const ys = tail.map((w) => w.score || 0);
    const mx = xs.reduce((a, b) => a + b, 0) / n; const my = ys.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0) || 1;
    gainPerSheet = num / den;
  }
  // Keep it honest: a flat or falling trend still earns a small practice
  // effect; a steep trend is capped.
  gainPerSheet = Math.max(0.75, Math.min(6, gainPerSheet));

  const current = predictedScore(ws);
  const futureSheets = Math.max(1, Math.round(sheetsPerWeek * weeks));
  let projected = current;
  for (let i = 0; i < futureSheets; i++) projected += gainPerSheet * (1 - projected / 100);
  projected = Math.min(99, Math.round(projected));

  const nb = nextBoundary(current, board);
  let weeksToNext = null;
  if (nb) {
    let s = current; let sheets = 0;
    while (s < nb.score && sheets < 200) { s += gainPerSheet * (1 - s / 100); sheets += 1; }
    weeksToNext = sheets < 200 && sheetsPerWeek > 0 ? Math.max(1, Math.ceil(sheets / sheetsPerWeek)) : null;
  }

  const currentLabel = gradeLabel(current, board);
  const projectedLabel = gradeLabel(projected, board);
  const crosses = nb && projected >= nb.score;
  const message = crosses
    ? `Keep this up for ${weeks} weeks and you're on track for ${nb.label === projectedLabel ? projectedLabel : projectedLabel} in ${subject}.`
    : nb && weeksToNext
      ? `At this pace you reach ${nb.label} in ${subject} in about ${weeksToNext} week${weeksToNext === 1 ? '' : 's'}${streak >= 3 ? ` — your ${streak}-day streak is doing the work` : ''}.`
      : `Keep this rhythm and ${subject} holds at ${projectedLabel}.`;

  // A projection is only worth showing when it actually predicts a change:
  // the projected grade differs from the current one, or a boundary is crossed.
  const changes = crosses || projectedLabel !== currentLabel;
  return { subject, board, current, projected, weeks, sheetsPerWeek: +sheetsPerWeek.toFixed(1), gainPerSheet: +gainPerSheet.toFixed(1), currentLabel, projectedLabel, nextBoundary: nb, weeksToNext, crosses, changes, message, tone: formatGrade(projected, board).tone };
}

// Pick the most motivating subject to headline: one that crosses a boundary
// soonest, else the one with the most sheets.
export function bestProjection(worksheets, subjects, boards, opts = {}) {
  const all = (subjects || []).map((s) => projectStreak(worksheets, { ...opts, subject: s, board: boards?.[s]?.board || opts.board })).filter(Boolean);
  // Only surface projections that predict an actual change; a flat "holds at
  // the same grade" projection is not shown.
  const changing = all.filter((p) => p.changes);
  if (!changing.length) return null;
  const crossing = changing.filter((p) => p.crosses).sort((a, b) => (a.weeksToNext || 99) - (b.weeksToNext || 99));
  if (crossing.length) return crossing[0];
  return changing.sort((a, b) => (a.weeksToNext || 99) - (b.weeksToNext || 99))[0];
}
