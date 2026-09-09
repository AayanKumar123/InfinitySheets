import React from 'react';
import { BookOpen, ChevronRight, Play } from 'lucide-react';

const toneToBadge = {
  primary: 'bg-blue-100 text-blue-700',
  violet: 'bg-blue-100 text-blue-700',
  blue: 'bg-violet-100 text-violet-700',
  secondary: 'bg-violet-100 text-violet-700',
  cyan: 'bg-red-100 text-red-700',
  accent: 'bg-red-100 text-red-700',
  success: 'bg-emerald-100 text-emerald-700',
};

function TopicRow({ topic, stats, onOpen, onLaunch }) {
  const acc = stats && stats.total ? Math.round((stats.correct / stats.total) * 100) : null;
  const barColor = acc === null
    ? ''
    : acc >= 70 ? 'bg-emerald-500' : acc >= 40 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      data-testid={`topic-row-${topic}`}
      className="text-left rounded-xl border border-[color:var(--color-border)] px-4 py-3 flex items-center justify-between gap-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group cursor-pointer"
    >
      <div className="min-w-0">
        <div className="text-[14.5px] font-medium text-slate-900">{topic}</div>
        <div className="text-[12px] text-slate-500 mt-0.5">
          {acc !== null ? `Your accuracy ${acc}% · ${stats.total} questions` : 'Not attempted yet'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {acc !== null && (
          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${acc}%` }} />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLaunch(); }}
          data-testid={`topic-practice-${topic}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-[12px] font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Practise
        </button>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

/**
 * Card listing all topics of a subject with per-topic accuracy indicators.
 */
export default function TopicsList({ subject, tone, topics, stats, onLaunch, onOpen }) {
  return (
    <div className="card-soft p-6" data-testid="topics-list">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneToBadge[tone] || toneToBadge.primary}`}>
          <BookOpen className="w-5 h-5" />
        </span>
        <h3 className="text-[16px] font-semibold text-slate-900">Topics in {subject}</h3>
      </div>
      <p className="text-[13.5px] text-slate-500 mb-5">Open a topic for what the exam wants, sources and an AI tutor — or jump straight into a worksheet.</p>
      <div className="flex flex-col gap-2">
        {topics.map((t) => (
          <TopicRow key={t} topic={t} stats={stats[t]} onLaunch={() => onLaunch(t)} onOpen={() => (onOpen ? onOpen(t) : onLaunch(t))} />
        ))}
        {topics.length === 0 && (
          <div className="text-[13px] text-slate-500">No topics defined for this subject yet.</div>
        )}
      </div>
    </div>
  );
}
