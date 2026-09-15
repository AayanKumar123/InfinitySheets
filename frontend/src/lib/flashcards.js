// Flashcards from mistakes. The deck is derived from the mistake list; the
// student's card-by-card progress ({ [key]: { stage, due, seen } }) lives
// in state.flashcards.cards. Intervals match spaced repetition:
// Again → 0 (today), Hard → 1 day, Good → next stage, Easy → skip a stage.
import { REVIEW_INTERVALS_DAYS } from './spacedRepetition';

const DAY = 24 * 60 * 60 * 1000;

export function cardKey(m) {
  return `${m.subject || ''}|${String(m.question || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160)}`;
}

function answerText(m) {
  if (m.typedAnswer) return m.typedAnswer;
  if (Array.isArray(m.options) && typeof m.correct === 'number') return m.options[m.correct];
  if (typeof m.correct === 'string') return m.correct;
  if (Array.isArray(m.examKeywords) && m.examKeywords.length) return `Key ideas: ${m.examKeywords.join(', ')}`;
  return '';
}

/** Deck: one card per distinct mistake, with progress merged in. */
export function buildDeck(mistakes = [], progress = {}, { subject, now = Date.now() } = {}) {
  const seen = new Set();
  const deck = [];
  (mistakes || []).forEach((m) => {
    if (!m || !m.question) return;
    if (subject && m.subject !== subject) return;
    const key = cardKey(m);
    if (seen.has(key)) return;
    seen.add(key);
    const back = answerText(m);
    if (!back) return;
    const p = progress[key] || { stage: 0, due: 0, seen: 0 };
    deck.push({ key, subject: m.subject, topic: m.topic, front: m.question, back, stage: p.stage, due: p.due, seen: p.seen, dueNow: (p.due || 0) <= now });
  });
  return deck.sort((a, b) => (a.due || 0) - (b.due || 0));
}

/** Next progress entry after a rating: 'again' | 'hard' | 'good' | 'easy'. */
export function rateCard(entry, rating, now = Date.now()) {
  const stage = entry?.stage || 0;
  let next = stage;
  let days = 0;
  if (rating === 'again') { next = 0; days = 0; }
  else if (rating === 'hard') { next = Math.max(0, stage); days = 1; }
  else if (rating === 'good') { next = Math.min(REVIEW_INTERVALS_DAYS.length, stage + 1); days = REVIEW_INTERVALS_DAYS[Math.min(next, REVIEW_INTERVALS_DAYS.length - 1)]; }
  else { next = Math.min(REVIEW_INTERVALS_DAYS.length, stage + 2); days = REVIEW_INTERVALS_DAYS[Math.min(next, REVIEW_INTERVALS_DAYS.length - 1)] * 2; }
  return { stage: next, due: now + days * DAY, seen: (entry?.seen || 0) + 1, last: now };
}
