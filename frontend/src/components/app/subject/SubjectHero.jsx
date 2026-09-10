import React from 'react';
import { ListChecks } from 'lucide-react';
import InfinityBackground from '../../decor/InfinityBackground';
import CreateWorksheetButton from '../CreateWorksheetButton';

const toneToBg = {
  primary: 'bg-blue-600',
  violet: 'bg-blue-600',
  blue: 'bg-violet-600',
  secondary: 'bg-violet-600',
  cyan: 'bg-red-600',
  accent: 'bg-red-600',
  success: 'bg-emerald-600',
};

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/12 backdrop-blur border border-white/20 px-4 py-3">
      <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-white/70">{label}</div>
      <div className="text-[18px] font-semibold text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}

/**
 * Full-bleed hero banner at the top of the subject overview page.
 * Renders subject title, description, primary CTAs, and a small stats grid.
 */
export default function SubjectHero({ subject, info, examTrack, ibLevel, topicCount, subjectAccuracy, worksheetCount, questionCount, onCreateWorksheet, onViewHistory }) {
  return (
    <div className="relative overflow-hidden rounded-2xl text-white" data-testid="subject-hero">
      <div className={`absolute inset-0 ${toneToBg[info.tone] || toneToBg.primary}`} />
      <InfinityBackground variant="hero" />
      <div className="absolute inset-0 grid-fade opacity-60" />
      <div className="relative p-7 lg:p-10 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-[28px] font-semibold">{info.emoji}</div>
            <div>
              <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-white/70" data-testid="subject-hero-board">{examTrack}{ibLevel ? ` ${ibLevel}` : ''} · Subject overview</div>
              <div className="text-[28px] font-semibold tracking-tight leading-tight">{subject}</div>
            </div>
          </div>
          <p className="text-[15.5px] text-white/85 max-w-[640px] leading-relaxed sr-only">{info.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CreateWorksheetButton
              onClick={onCreateWorksheet}
              data-testid="hero-create-worksheet"
              className="px-5 py-2.5"
            />
            <button
              onClick={onViewHistory}
              data-testid="hero-view-history"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/30 text-white hover:bg-white/10 transition-colors text-[14px] font-medium"
            >
              <ListChecks className="w-5 h-5" /> View history
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Topics" value={topicCount} />
          <MiniStat label="Your accuracy" value={`${subjectAccuracy}%`} />
          <MiniStat label="Worksheets" value={worksheetCount} />
          <MiniStat label="Questions tried" value={questionCount} />
        </div>
      </div>
    </div>
  );
}
