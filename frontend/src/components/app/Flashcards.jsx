import React, { useMemo, useState } from 'react';
import { Layers, ChevronRight, Printer, Lightbulb, Loader2, Check, X, ArrowLeft, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { buildTopicDeck, topicProgress, deckKey } from '../../lib/flashcards';
import { enrolledSubjects, boardFor, syllabusTopicNames } from '../../lib/subjects';
import { TOPICS } from '../../data/mock';
import { askAi, isAiEnabled, generateFlashcards } from '../../lib/ai';
import { exportFlashcardsPdf } from '../../lib/exportData';
import { track } from '../../lib/analytics';
import AdSlot from '../ads/AdSlot';

const EMPTY = {};

// Flashcards the SaveMyExams way: subject → topic → a deck of concept cards.
// Read the front, reveal, then "I knew it" or "I didn't know it". Cards you
// didn't know come back at the end of the session.
export default function Flashcards({ go }) {
  const { state, markFlashcard, saveFlashcardDeck, saveFlashcardExplanation } = useApp();
  const subjects = useMemo(() => enrolledSubjects(state.courses, state.user?.subjects, state.user?.examTrack), [state.courses, state.user?.subjects, state.user?.examTrack]);
  const [subject, setSubject] = useState(subjects[0] || '');
  const activeSubject = subjects.includes(subject) ? subject : subjects[0] || '';
  const board = boardFor(activeSubject, state.courses, state.user?.examTrack);
  const topics = useMemo(() => syllabusTopicNames(state.syllabusTopics, board, activeSubject) || TOPICS[activeSubject] || [], [state.syllabusTopics, board, activeSubject]);
  const [topic, setTopic] = useState(null);
  const aiOn = isAiEnabled(state);
  const decks = useMemo(() => state.flashcards?.decks || EMPTY, [state.flashcards?.decks]);
  const progress = useMemo(() => state.flashcards?.cards || EMPTY, [state.flashcards?.cards]);

  // Per-topic decks for the picker.
  const topicDecks = useMemo(() => topics.map((t) => {
    const deck = buildTopicDeck({ mistakes: state.mistakes, decks, cards: progress, subject: activeSubject, topic: t });
    return { topic: t, deck, ...topicProgress(deck), hasConcepts: !!decks[deckKey(activeSubject, t)] };
  }), [topics, state.mistakes, decks, progress, activeSubject]);

  if (!subjects.length) {
    return (
      <div className="max-w-[820px]">
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-slate-50/50" data-testid="fc-empty">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-[15px] font-semibold text-slate-800">Add a course first</div>
          <div className="text-[13px] text-slate-500 mt-1">Flashcards are organised by subject and topic from your courses.</div>
          <button onClick={() => go('courses')} className="btn-violet mt-4 px-4 py-2 rounded-lg text-[13.5px] font-medium">My courses</button>
        </div>
      </div>
    );
  }

  if (topic) {
    return <TopicSession subject={activeSubject} topic={topic} board={board} aiOn={aiOn} onBack={() => setTopic(null)} markFlashcard={markFlashcard} saveFlashcardDeck={saveFlashcardDeck} saveFlashcardExplanation={saveFlashcardExplanation} />;
  }

  return (
    <div className="max-w-[900px]">
      <p className="text-[14px] text-zinc-500 mb-5">Pick a topic and work through its cards: read, reveal, then say whether you knew it. No scores — the ones you didn't know just come round again.</p>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {subjects.map((s) => (
          <button key={s} type="button" onClick={() => setSubject(s)} data-testid={`fc-subject-${s.replace(/\s+/g, '-')}`} className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium border transition-colors ${activeSubject === s ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{s}</button>
        ))}
        <span className="text-[12px] text-slate-500 ml-auto">{board}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5" data-testid="fc-topics">
        {topicDecks.map((t) => (
          <button key={t.topic} type="button" onClick={() => setTopic(t.topic)} data-testid={`fc-topic-${t.topic.replace(/\W+/g, '-')}`} className="text-left rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 hover:border-violet-300 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[14px] font-semibold text-slate-900 truncate">{t.topic}</div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-[12px] text-slate-500 mt-0.5">
              {t.total ? `${t.total} cards · ${t.known} known${t.unknown ? ` · ${t.unknown} to revisit` : ''}` : (t.hasConcepts ? 'Empty deck' : aiOn ? 'Tap to build the deck' : 'No cards yet')}
            </div>
            {t.total > 0 && (
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-emerald-500" style={{ width: `${t.pct}%` }} /></div>
            )}
          </button>
        ))}
      </div>
      {!aiOn && <div className="text-[12px] text-slate-500 mt-4">With the AI off, decks only contain questions you have missed. Turn the AI on in Settings to get concept cards for every topic.</div>}
      <AdSlot slot="strengths" size="compact" className="mt-6" />
    </div>
  );
}

function TopicSession({ subject, topic, board, aiOn, onBack, markFlashcard, saveFlashcardDeck, saveFlashcardExplanation }) {
  const { state } = useApp();
  const decks = useMemo(() => state.flashcards?.decks || EMPTY, [state.flashcards?.decks]);
  const progress = useMemo(() => state.flashcards?.cards || EMPTY, [state.flashcards?.cards]);
  const deck = useMemo(() => buildTopicDeck({ mistakes: state.mistakes, decks, cards: progress, subject, topic }), [state.mistakes, decks, progress, subject, topic]);
  // Session queue: everything not resting, in order; unknowns are re-queued.
  const [queue, setQueue] = useState(() => deck.filter((c) => !c.resting).map((c) => c.key));
  const [includeResting, setIncludeResting] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ known: 0, unknown: 0, seen: new Set() });
  const [building, setBuilding] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const byKey = useMemo(() => new Map(deck.map((c) => [c.key, c])), [deck]);
  const card = byKey.get(queue[0]) || null;
  const hasConcepts = !!decks[deckKey(subject, topic)];

  const build = async () => {
    setBuilding(true);
    try {
      const cards = await generateFlashcards({ board, subject, topic, count: 12 });
      saveFlashcardDeck(subject, topic, cards);
      setQueue((q) => [...q, ...cards.map((_, i) => `${deckKey(subject, topic)}#${i}`)]);
      track('flashcards_built', { n: cards.length });
      toast.success(`${cards.length} cards ready for ${topic}`);
    } catch (e) { toast.error(e.message || 'Could not build the deck'); }
    finally { setBuilding(false); }
  };
  const answer = (knew) => {
    if (!card) return;
    markFlashcard(card.key, knew);
    track('flashcard_marked', { knew });
    setTally((t) => ({ known: t.known + (knew ? 1 : 0), unknown: t.unknown + (knew ? 0 : 1), seen: new Set([...t.seen, card.key]) }));
    setFlipped(false);
    // Didn't know it → back of the queue for this session.
    setQueue((q) => (knew ? q.slice(1) : [...q.slice(1), q[0]]));
  };
  const restart = (all) => {
    setQueue(deck.filter((c) => all || !c.resting).map((c) => c.key));
    setIncludeResting(all);
    setTally({ known: 0, unknown: 0, seen: new Set() });
    setFlipped(false);
  };
  const explain = async () => {
    if (!card || explaining) return;
    setExplaining(true);
    try {
      const content = `Flashcard the student is revising.\nFront: ${card.front}\nBack: ${card.back}\nExplain the underlying concept in under 120 words, as a tutor would: what the idea is, the one rule to remember, and the trap that makes students get it wrong. Plain text, no headings.`;
      const text = await askAi({ mode: 'chat', context: { board, subject, topic }, messages: [{ role: 'user', content }] });
      saveFlashcardExplanation(card.key, text);
    } catch (e) { toast.error(e.message || 'Could not explain this card'); }
    finally { setExplaining(false); }
  };
  const explanation = card ? state.flashcards?.explanations?.[card.key] : null;
  const remaining = queue.length;
  const total = tally.seen.size + remaining;

  return (
    <div className="max-w-[820px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-slate-900" data-testid="fc-back"><ArrowLeft className="w-4 h-4" /> {subject}</button>
        <div className="flex items-center gap-2">
          {deck.length > 0 && <button type="button" onClick={() => { exportFlashcardsPdf(deck, `${subject} — ${topic}`); track('flashcards_printed', { n: deck.length }); }} className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px]" data-testid="fc-print"><Printer className="w-3.5 h-3.5" /> Print</button>}
          {aiOn && !hasConcepts && <button onClick={build} disabled={building} className="btn-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold disabled:opacity-60" data-testid="fc-build">{building ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Build concept cards</button>}
        </div>
      </div>
      <div className="mb-3">
        <div className="text-[18px] font-semibold text-slate-900">{topic}</div>
        <div className="text-[12.5px] text-slate-500">{deck.length} cards in this deck{tally.seen.size ? ` · ${tally.known} knew · ${tally.unknown} didn't` : ''}{remaining ? ` · ${remaining} to go` : ''}</div>
        {total > 0 && <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-violet-500 transition-all" style={{ width: `${Math.round(((total - remaining) / total) * 100)}%` }} /></div>}
      </div>

      {deck.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-slate-50/50" data-testid="fc-empty">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-[15px] font-semibold text-slate-800">No cards for {topic} yet</div>
          <div className="text-[13px] text-slate-500 mt-1">{aiOn ? 'Build the concept cards for this topic — one click, then they are yours for good.' : 'Cards come from questions you miss on worksheets, or from the AI when it is on.'}</div>
          {aiOn && <button onClick={build} disabled={building} className="btn-violet mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium disabled:opacity-60" data-testid="fc-build-empty">{building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Build concept cards</button>}
        </div>
      ) : !card ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center" data-testid="fc-done">
          <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-[16px] font-semibold text-slate-900">{tally.seen.size ? 'Deck done' : 'Nothing to review right now'}</div>
          <div className="text-[13px] text-slate-600 mt-1">{tally.seen.size ? `You knew ${tally.known} straight away and got the other ${tally.unknown} on the second pass.` : 'Every card here is one you knew recently — they come back when it is time.'}</div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button onClick={() => restart(false)} className="btn-outline-dark inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px]"><RotateCcw className="w-4 h-4" /> Go again</button>
            {!includeResting && deck.some((c) => c.resting) && <button onClick={() => restart(true)} className="btn-violet px-4 py-2 rounded-lg text-[13px] font-medium" data-testid="fc-all">Include the ones I knew</button>}
            <button onClick={onBack} className="btn-outline-dark px-4 py-2 rounded-lg text-[13px]">Another topic</button>
          </div>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => setFlipped((v) => !v)} className="w-full text-left rounded-2xl border border-[color:var(--color-border)] bg-white p-6 min-h-[220px] shadow-sm hover:border-violet-300 transition-colors" data-testid="fc-card">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
              <span>{card.source === 'mistake' ? 'From a question you missed' : 'Concept'}</span>
              <span>{flipped ? 'Answer' : 'Question'}</span>
            </div>
            <div className="text-[17px] font-medium text-slate-900 leading-snug whitespace-pre-wrap">{flipped ? card.back : card.front}</div>
            {!flipped && <div className="text-[12px] text-slate-500 mt-4">Tap to reveal</div>}
          </button>
          {flipped && (
            <div className="mt-3" data-testid="fc-explain">
              {explanation ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px] text-slate-800 leading-relaxed"><div className="text-[10.5px] uppercase tracking-wide text-amber-700 mb-1 inline-flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> The concept</div>{explanation}</div>
              ) : aiOn ? (
                <button onClick={explain} disabled={explaining} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-60" data-testid="fc-explain-btn">{explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />} Explain this to me</button>
              ) : null}
            </div>
          )}
          {flipped ? (
            <div className="grid grid-cols-2 gap-3 mt-4" data-testid="fc-rate">
              <button onClick={() => answer(false)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-[14px] font-semibold hover:bg-rose-100" data-testid="fc-unknown"><X className="w-5 h-5" /> I didn't know it</button>
              <button onClick={() => answer(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[14px] font-semibold hover:bg-emerald-100" data-testid="fc-known"><Check className="w-5 h-5" /> I knew it</button>
            </div>
          ) : (
            <div className="mt-4 flex justify-end">
              <button onClick={() => setFlipped(true)} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium" data-testid="fc-flip">Show answer <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}
      <AdSlot slot="strengths" size="compact" className="mt-6" />
    </div>
  );
}
