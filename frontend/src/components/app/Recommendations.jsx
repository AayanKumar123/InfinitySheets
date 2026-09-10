import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, TrendingDown, Stethoscope } from 'lucide-react';
import EmptyStateScene from '../decor/EmptyStateScene';
import CreateWorksheetButton from './CreateWorksheetButton';
import { useStrengthsWeaknesses, useSavedSwOverrides } from '../../hooks/useStrengthsWeaknesses';
import { subjectBoards, boardName } from '../../lib/subjects';
import AiChat from './ai/AiChat';
import DiagnosisPanel from './ai/DiagnosisPanel';

export default function Recommendations({ go }) {
  const { state } = useApp();
  // Memoised: a fresh `[]` fallback each render would invalidate every useMemo below.
  const ws = useMemo(() => state.worksheets || [], [state.worksheets]);

  const swOverrides = useSavedSwOverrides();
  const {
    byTopic,
    strengthMin,
    weaknessMax,
    isCustom,
    weaknesses,
    strengths,
  } = useStrengthsWeaknesses(ws, swOverrides);

  // What the AI coach knows about this student: boards, exam date, weakest and
  // strongest topics. Sent as a hidden first message, never stored anywhere.
  const examTrack = state.user?.examTrack || 'CBSE';
  const boards = useMemo(() => subjectBoards(state.courses, examTrack), [state.courses, examTrack]);
  const coach = useMemo(() => {
    const boardList = Array.from(new Set([...Object.values(boards).map((b) => b.board), examTrack]));
    const weak = [...weaknesses].sort((a, b) => a.acc - b.acc).slice(0, 6).map((t) => `${t.topic} (${t.subject}, ${t.acc}%)`);
    const strong = [...(strengths || [])].sort((a, b) => b.acc - a.acc).slice(0, 3).map((t) => `${t.topic} (${t.subject}, ${t.acc}%)`);
    const subjects = Array.from(new Set(ws.map((w) => w.subject)));
    const primer = [
      `Student profile — boards: ${boardList.map(boardName).join(', ')}.`,
      state.settings?.examDate ? `Exam date: ${state.settings.examDate}.` : 'Exam date: not set.',
      `Subjects with attempts: ${subjects.join(', ') || 'none yet'}. Worksheets completed: ${ws.length}.`,
      `Weakest topics: ${weak.join('; ') || 'none identified yet'}.`,
      `Strongest topics: ${strong.join('; ') || 'none identified yet'}.`,
      ...ws.filter((w) => w.diagnosis).slice(0, 3).map((w) => `Latest diagnosis (${w.subject} · ${w.topic}, ${w.score}%): ${String(w.diagnosis.text).slice(0, 500)}`),
      'Use this to give prioritised, specific advice.',
    ].join('\n');
    return { primer, context: { board: boardList[0], boards: boardList } };
  }, [boards, examTrack, weaknesses, strengths, ws, state.settings?.examDate]);

  // Every finished worksheet, newest first — each carries (or can run) its
  // AI diagnosis. Diagnosed sheets float to the top so the page reads as a
  // learning log rather than a history table.
  const [showAll, setShowAll] = useState(false);
  const diagnosisSheets = useMemo(() => {
    const sorted = [...ws].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return showAll ? sorted : sorted.slice(0, 6);
  }, [ws, showAll]);
  const diagnosedCount = ws.filter((w) => w.diagnosis).length;

  const diagnosesPanel = ws.length > 0 && (
    <div className="flex flex-col gap-3" data-testid="smart-learning-diagnoses">
      <div className="flex items-center justify-between gap-3 mt-2">
        <div>
          <div className="eyebrow-muted flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-emerald-600" /> Worksheet diagnoses</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{diagnosedCount} of {ws.length} worksheet{ws.length === 1 ? '' : 's'} diagnosed — what went wrong and what to do about it.</div>
        </div>
      </div>
      {diagnosisSheets.map((w) => <DiagnosisPanel key={w.id} sheet={w} compact testid={`diagnosis-${w.id}`} />)}
      {ws.length > 6 && (
        <button onClick={() => setShowAll((v) => !v)} className="text-[12.5px] font-medium text-blue-700 hover:underline w-fit">
          {showAll ? 'Show fewer' : `Show all ${ws.length} worksheets`}
        </button>
      )}
    </div>
  );

  const coachPanel = (
    <AiChat
      title="AI study coach"
      subtitle="Knows your weak topics, your boards, your exam date and your diagnoses."
      mode="recommend"
      context={coach.context}
      primer={coach.primer}
      intro="I can see your results. Ask me what to practise next, why a topic keeps tripping you up, or for a plan up to your exam."
      suggestions={['What should I focus on this week?', 'Make me a 7-day revision plan', 'Why do I keep losing marks?', 'How do I turn my weakest topic around?']}
      placeholder="Ask your coach…"
      testid="recommendations-chat"
    />
  );

  // Prioritize adaptive weaknesses first (ascending accuracy → hardest first).
  // If there are fewer than 4 weaknesses, backfill with the next lowest topics
  // so the panel always feels useful.
  const recs = useMemo(() => {
    const weakAsc = [...weaknesses].sort((a, b) => a.acc - b.acc);
    if (weakAsc.length >= 4) return weakAsc.slice(0, 4);
    const rest = byTopic
      .filter((t) => !weakAsc.some((w) => w.topic === t.topic))
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 4 - weakAsc.length);
    return [...weakAsc, ...rest];
  }, [weaknesses, byTopic]);

  const actionsPanel = (
    <div className="flex flex-col gap-2" data-testid="next-best-actions">
      <div className="eyebrow-muted flex items-center gap-1.5">
        <TrendingDown className="w-4 h-4 text-rose-500" /> Next best actions
      </div>
      <div className="text-[12px] text-slate-500 -mt-1">Your weakest topics first.</div>
      {recs.map((r, i) => {
        const isWeakness = r.acc < weaknessMax;
        return (
          <div key={r.topic} className="rounded-xl border border-[color:var(--color-border)] bg-white p-4 flex flex-col gap-2" data-testid={`next-action-${i + 1}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold text-slate-900 leading-snug">Practice {r.topic}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{r.acc}% accuracy &middot; {r.subject}</div>
              </div>
              {isWeakness && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-semibold">Weakness</span>
              )}
            </div>
            <button
              onClick={() => { window.sessionStorage.setItem('preselect_subject', r.subject); go('worksheets'); }}
              className="btn-violet inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold w-full"
            >
              Start <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );

  if (recs.length === 0) {
    return (
      <div className="flex flex-col gap-5 max-w-[900px]">
      {coachPanel}
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
        <EmptyStateScene variant="lab" className="absolute inset-0" />
        <div className="relative p-12 text-center">
          <Sparkles className="w-6 h-6 text-slate-400 mx-auto mb-3" />
          <div className="text-[15px] font-medium text-slate-700">No recommendations yet</div>
          <div className="text-[13px] text-slate-500 mt-1">Complete a worksheet so we can suggest your next best actions.</div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1180px]">
      {/* The coach leads the page — it can answer about everything below it. */}
      {coachPanel}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        <div className="flex flex-col gap-3 min-w-0">
      <div className="flex justify-end">
        <CreateWorksheetButton
          onClick={() => go('worksheets')}
          data-testid="recommendations-create-worksheet"
        />
      </div>
      {/* Threshold context banner */}
      <div className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          Prioritizing your weakest topics
        </span>
        <span className="text-slate-400">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
          Weakness &lt; <span className="tabular-nums font-medium text-slate-800">{weaknessMax}%</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
          Strength ≥ <span className="tabular-nums font-medium text-slate-800">{strengthMin}%</span>
        </span>
        <span className="text-slate-400">
          {isCustom
            ? <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10.5px] font-medium">Custom thresholds</span>
            : <span className="inline-flex items-center gap-1"><Sparkles className="w-4 h-4" />Adaptive</span>}
        </span>
      </div>

      {diagnosesPanel}
        </div>

        <div className="min-w-0 lg:sticky lg:top-4">{actionsPanel}</div>
      </div>
    </div>
  );
}
