import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, TrendingDown } from 'lucide-react';
import EmptyStateScene from '../decor/EmptyStateScene';
import CreateWorksheetButton from './CreateWorksheetButton';
import { useStrengthsWeaknesses, useSavedSwOverrides } from '../../hooks/useStrengthsWeaknesses';
import { subjectBoards, boardName } from '../../lib/subjects';
import AiChat from './ai/AiChat';

export default function Recommendations({ go }) {
  const { state } = useApp();
  const ws = state.worksheets || [];

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
      'Use this to give prioritised, specific advice.',
    ].join('\n');
    return { primer, context: { board: boardList[0], boards: boardList } };
  }, [boards, examTrack, weaknesses, strengths, ws, state.settings?.examDate]);

  const coachPanel = (
    <AiChat
      title="AI study coach"
      subtitle="Knows your weak topics, your boards and your exam date."
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

  if (recs.length === 0) {
    return (
      <div className="flex flex-col gap-3 max-w-[820px]">
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
        <EmptyStateScene variant="lab" className="absolute inset-0" />
        <div className="relative p-12 text-center">
          <Sparkles className="w-6 h-6 text-slate-400 mx-auto mb-3" />
          <div className="text-[15px] font-medium text-slate-700">No recommendations yet</div>
          <div className="text-[13px] text-slate-500 mt-1">Complete a worksheet so we can suggest your next best actions.</div>
        </div>
      </div>
      {coachPanel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-[820px]">
      {/* Standalone creation entry point; the per-recommendation "Start"
          buttons below stay contextual to their topic. */}
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

      {recs.map((r, i) => {
        const isWeakness = r.acc < weaknessMax;
        return (
          <div key={r.topic} className="rounded-xl border border-zinc-200 p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-blue-600 inline-flex items-center gap-2">
                Next best action {i + 1}
                {isWeakness && (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 tracking-normal text-[10px] font-medium normal-case">
                    Weakness
                  </span>
                )}
              </div>
              <div className="text-[15.5px] font-semibold text-zinc-900 mt-1">Practice {r.topic}</div>
              <div className="text-[13px] text-zinc-500 mt-0.5">Current accuracy {r.acc}% · {r.subject}</div>
            </div>
            <button
              onClick={() => { window.sessionStorage.setItem('preselect_subject', r.subject); go('worksheets'); }}
              className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium"
            >
              Start <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        );
      })}

      {coachPanel}
    </div>
  );
}
