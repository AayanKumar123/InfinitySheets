// Goals & badges, computed from state so they can never drift from what the
// student actually did. Unlocked ids are persisted to `achievements` for
// real accounts (AppContext) purely so the unlock date survives devices.

export const BADGES = [
  { id: 'first-sheet', name: 'First steps', emoji: '🚀', how: 'Finish your first worksheet' },
  { id: 'ten-sheets', name: 'Getting serious', emoji: '📚', how: 'Finish 10 worksheets' },
  { id: 'fifty-sheets', name: 'Marathon', emoji: '🏃', how: 'Finish 50 worksheets' },
  { id: 'hundred-questions', name: 'Century', emoji: '💯', how: 'Answer 100 questions' },
  { id: 'five-hundred-questions', name: 'Grinder', emoji: '⚙️', how: 'Answer 500 questions' },
  { id: 'streak-3', name: 'Warm-up', emoji: '🔥', how: 'Study 3 days in a row' },
  { id: 'streak-7', name: 'One week', emoji: '📅', how: 'Study 7 days in a row' },
  { id: 'streak-30', name: 'Iron will', emoji: '🛡️', how: 'Study 30 days in a row' },
  { id: 'perfect', name: 'Flawless', emoji: '✨', how: 'Score 100% on a worksheet of 5+ questions' },
  { id: 'ninety', name: 'Top marks', emoji: '🎯', how: 'Score 90%+ on a worksheet' },
  { id: 'hard-mode', name: 'Hard mode', emoji: '🧗', how: 'Score 70%+ on a Hard worksheet' },
  { id: 'exam-mode', name: 'Exam ready', emoji: '🔒', how: 'Finish a worksheet in exam mode' },
  { id: 'simulation', name: 'Full paper', emoji: '📝', how: 'Complete an exam simulation' },
  { id: 'reviewer', name: 'Second chance', emoji: '🔁', how: 'Get a review question right' },
  { id: 'all-subjects', name: 'All-rounder', emoji: '🌍', how: 'Practise 3 different subjects' },
  { id: 'weekly-goal', name: 'Goal getter', emoji: '🏁', how: 'Hit your weekly question goal' },
  { id: 'comeback', name: 'Comeback', emoji: '📈', how: 'Improve a topic by 20+ points' },
  { id: 'flashcards', name: 'Card shark', emoji: '🃏', how: 'Review 20 flashcards' },
];

const DAY = 24 * 60 * 60 * 1000;

/** Which badges are unlocked: { [id]: true }. */
export function computeBadges(state, now = Date.now()) {
  const ws = (state.worksheets || []).filter((w) => w && (w.total || 0) > 0);
  const out = {};
  const on = (id) => { out[id] = true; };
  const questions = ws.reduce((s, w) => s + (w.total || 0), 0);
  if (ws.length >= 1) on('first-sheet');
  if (ws.length >= 10) on('ten-sheets');
  if (ws.length >= 50) on('fifty-sheets');
  if (questions >= 100) on('hundred-questions');
  if (questions >= 500) on('five-hundred-questions');
  const streak = state.streak || 0;
  if (streak >= 3) on('streak-3');
  if (streak >= 7) on('streak-7');
  if (streak >= 30) on('streak-30');
  if (ws.some((w) => w.score === 100 && w.total >= 5)) on('perfect');
  if (ws.some((w) => w.score >= 90)) on('ninety');
  if (ws.some((w) => w.difficulty === 'Hard' && w.score >= 70)) on('hard-mode');
  if (ws.some((w) => w.examMode || w.analytics?.examMode)) on('exam-mode');
  if (ws.some((w) => w.simulation)) on('simulation');
  if (ws.some((w) => (w.questions || []).some((q, i) => q?.source === 'review' && (Array.isArray(w.results) ? w.results[i] : false)))) on('reviewer');
  if (new Set(ws.map((w) => w.subject).filter(Boolean)).size >= 3) on('all-subjects');
  const weekAgo = now - 7 * DAY;
  const thisWeek = ws.filter((w) => new Date(w.date).getTime() >= weekAgo).reduce((s, w) => s + (w.total || 0), 0);
  if (thisWeek >= (state.settings?.weeklyGoal || 50)) on('weekly-goal');
  // Comeback: any topic whose latest sheet beats its first by 20 points.
  const byTopic = {};
  [...ws].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((w) => {
    (w.topics || [w.topic]).forEach((t) => {
      const k = `${w.subject}|${t}`;
      if (!byTopic[k]) byTopic[k] = { first: w.score, last: w.score };
      else byTopic[k].last = w.score;
    });
  });
  if (Object.values(byTopic).some((t) => t.last - t.first >= 20)) on('comeback');
  if ((state.flashcards?.reviewed || 0) >= 20) on('flashcards');
  return out;
}

/** The next badge worth chasing (closest by a simple progress estimate). */
export function nextBadge(state, unlocked) {
  const ws = (state.worksheets || []).filter((w) => w && (w.total || 0) > 0);
  const questions = ws.reduce((s, w) => s + (w.total || 0), 0);
  const streak = state.streak || 0;
  const progress = {
    'first-sheet': ws.length / 1, 'ten-sheets': ws.length / 10, 'fifty-sheets': ws.length / 50,
    'hundred-questions': questions / 100, 'five-hundred-questions': questions / 500,
    'streak-3': streak / 3, 'streak-7': streak / 7, 'streak-30': streak / 30,
  };
  let best = null;
  BADGES.forEach((b) => {
    if (unlocked[b.id]) return;
    const p = Math.min(0.99, progress[b.id] ?? 0);
    if (!best || p > best.progress) best = { ...b, progress: p };
  });
  return best;
}
