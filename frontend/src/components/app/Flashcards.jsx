import React, { useMemo, useState } from 'react';
import { Layers, RotateCcw, ChevronRight, Printer } from 'lucide-react';
import { exportFlashcardsPdf } from '../../lib/exportData';
import { track } from '../../lib/analytics';
import { useApp } from '../../context/AppContext';
import { buildDeck } from '../../lib/flashcards';
import { enrolledSubjects } from '../../lib/subjects';
import AdSlot from '../ads/AdSlot';

// Flashcards built from the mistake list: front = question, back = accepted
// answer. Ratings drive spaced intervals (see lib/flashcards.js).
export default function Flashcards({ go }) {
  const { state, rateFlashcard } = useApp();
  const subjects = useMemo(() => enrolledSubjects(state.courses, state.user?.subjects, state.user?.examTrack), [state.courses, state.user?.subjects, state.user?.examTrack]);
  const [subject, setSubject] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [onlyDue, setOnlyDue] = useState(true);
  const deck = useMemo(() => buildDeck(state.mistakes, state.flashcards?.cards || {}, { subject: subject || undefined }), [state.mistakes, state.flashcards, subject]);
  const queue = useMemo(() => (onlyDue ? deck.filter((c) => c.dueNow) : deck), [deck, onlyDue]);
  const card = queue[0];

  const rate = (rating) => {
    if (!card) return;
    rateFlashcard(card.key, rating);
    setFlipped(false);
  };

  return (
    <div className="max-w-[820px]">
      <p className="text-[14px] text-zinc-500 mb-5">Every question you have missed becomes a card. Flip it, rate how well you knew it, and it comes back just before you would forget.</p>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select className="input-base w-auto" value={subject} onChange={(e) => { setSubject(e.target.value); setFlipped(false); }} data-testid="fc-subject">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" onClick={() => { setOnlyDue((v) => !v); setFlipped(false); }} className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium border ${onlyDue ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 bg-white text-slate-700'}`} data-testid="fc-due-toggle">
          {onlyDue ? 'Due today' : 'Whole deck'}
        </button>
        <span className="text-[12.5px] text-slate-500">{queue.length} card{queue.length === 1 ? '' : 's'} {onlyDue ? 'due' : 'in deck'} · {deck.length} total · {state.flashcards?.reviewed || 0} reviewed</span>
        {deck.length > 0 && (
          <button type="button" onClick={() => { exportFlashcardsPdf(deck, `${subject || 'All subjects'} flashcards`); track('flashcards_printed', { n: deck.length }); }} className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] ml-auto" data-testid="fc-print">
            <Printer className="w-3.5 h-3.5" /> Print deck (PDF)
          </button>
        )}
      </div>

      {!card ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-slate-50/50" data-testid="fc-empty">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-[15px] font-semibold text-slate-800">{deck.length ? 'Nothing due right now' : 'No cards yet'}</div>
          <div className="text-[13px] text-slate-500 mt-1">{deck.length ? 'Come back tomorrow, or switch to the whole deck to keep going.' : 'Cards appear here from questions you get wrong in worksheets.'}</div>
          {!deck.length && <button onClick={() => go('worksheets')} className="btn-violet mt-4 px-4 py-2 rounded-lg text-[13.5px] font-medium">Create a worksheet</button>}
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => setFlipped((v) => !v)} className="w-full text-left rounded-2xl border border-[color:var(--color-border)] bg-white p-6 min-h-[220px] shadow-sm hover:border-violet-300 transition-colors" data-testid="fc-card">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2 flex items-center justify-between">
              <span>{card.subject}{card.topic ? ` · ${card.topic}` : ''}</span>
              <span>{flipped ? 'Answer' : 'Question'} · stage {card.stage}</span>
            </div>
            <div className="text-[17px] font-medium text-slate-900 leading-snug whitespace-pre-wrap">{flipped ? card.back : card.front}</div>
            {!flipped && <div className="text-[12px] text-slate-500 mt-4 inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Tap to reveal the answer</div>}
          </button>
          {flipped && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4" data-testid="fc-rate">
              <button onClick={() => rate('again')} className="px-3 py-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-800 text-[13px] font-semibold">Again <span className="block text-[10.5px] font-normal">today</span></button>
              <button onClick={() => rate('hard')} className="px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[13px] font-semibold">Hard <span className="block text-[10.5px] font-normal">1 day</span></button>
              <button onClick={() => rate('good')} className="px-3 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-[13px] font-semibold">Good <span className="block text-[10.5px] font-normal">next stage</span></button>
              <button onClick={() => rate('easy')} className="px-3 py-2.5 rounded-lg border border-sky-300 bg-sky-50 text-sky-800 text-[13px] font-semibold">Easy <span className="block text-[10.5px] font-normal">skip a stage</span></button>
            </div>
          )}
          {!flipped && (
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
