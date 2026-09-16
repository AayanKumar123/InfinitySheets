// Flashcards, SaveMyExams-style: pick a subject and topic, work through a
// deck of concept cards, and for each one say "I knew it" or "I didn't".
// No grades, no four-way ratings. Cards you didn't know come round again
// at the end of the session; cards you knew are rested for a while.
//
// Two card sources, merged per topic:
//   - concept cards the AI writes for the topic (cached per subject|topic
//     in state.flashcards.decks so a deck costs one AI call ever)
//   - the student's own missed questions for that topic
//
// Progress per card lives in state.flashcards.cards[key] =
//   { known, unknown, last: 'known'|'unknown', due }.

const DAY = 24 * 60 * 60 * 1000;
// Rest a known card longer each time it is known in a row: 1, 3, 7, 14, 30 days.
const REST_DAYS = [1, 3, 7, 14, 30];

export function deckKey(subject, topic) { return `${subject}|${topic}`; }

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

/** Cards made from the student's own mistakes in one topic. */
export function mistakeCards(mistakes = [], subject, topic) {
  const seen = new Set();
  const out = [];
  (mistakes || []).forEach((m) => {
    if (!m || !m.question || m.subject !== subject || (topic && m.topic !== topic)) return;
    const key = cardKey(m);
    if (seen.has(key)) return;
    seen.add(key);
    const back = answerText(m);
    if (back) out.push({ key, subject, topic: m.topic, front: m.question, back, source: 'mistake' });
  });
  return out;
}

/** Concept cards from the cached AI deck for a topic. */
export function conceptCards(decks = {}, subject, topic) {
  const d = decks[deckKey(subject, topic)];
  if (!d || !Array.isArray(d.cards)) return [];
  return d.cards.map((c, i) => ({ key: `${deckKey(subject, topic)}#${i}`, subject, topic, front: c.front, back: c.back, source: 'concept' }));
}

/** Everything for a topic, with progress merged in, unknown/new first. */
export function buildTopicDeck({ mistakes, decks, cards = {}, subject, topic, now = Date.now() }) {
  const all = [...conceptCards(decks, subject, topic), ...mistakeCards(mistakes, subject, topic)];
  return all.map((c) => {
    const p = cards[c.key] || { known: 0, unknown: 0, last: null, due: 0 };
    return { ...c, known: p.known, unknown: p.unknown, last: p.last, due: p.due, resting: p.last === 'known' && (p.due || 0) > now };
  });
}

/** Progress entry after "I knew it" / "I didn't know it". */
export function markCard(entry, knew, now = Date.now()) {
  const e = entry || { known: 0, unknown: 0, last: null, due: 0, streak: 0 };
  if (knew) {
    const streak = (e.streak || 0) + 1;
    return { known: e.known + 1, unknown: e.unknown, last: 'known', streak, due: now + REST_DAYS[Math.min(streak - 1, REST_DAYS.length - 1)] * DAY };
  }
  return { known: e.known, unknown: e.unknown + 1, last: 'unknown', streak: 0, due: now };
}

/** Topic-level summary for the picker: { total, known (resting), unknown }. */
export function topicProgress(deck) {
  const total = deck.length;
  const known = deck.filter((c) => c.resting).length;
  const unknown = deck.filter((c) => c.last === 'unknown').length;
  return { total, known, unknown, pct: total ? Math.round((known / total) * 100) : 0 };
}
