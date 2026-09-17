import React, { useMemo } from 'react';
import { Zap, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { todaysChallenge, challengeDone, challengeStreak } from '../../lib/dailyChallenge';
import { track } from '../../lib/analytics';

// Today's 5: a tiny mixed sheet on the weakest topics, once a day.
export function DailyChallengeCard({ worksheets, subjects, topicsFor, go }) {
  const ch = useMemo(() => todaysChallenge({ worksheets, subjects, topicsFor }), [worksheets, subjects, topicsFor]);
  const done = useMemo(() => (ch ? challengeDone(worksheets, ch.key) : null), [worksheets, ch]);
  const streak = useMemo(() => challengeStreak(worksheets), [worksheets]);
  if (!ch) return null;
  const start = () => {
    try {
      sessionStorage.setItem('preselect_subject', ch.subject);
      sessionStorage.setItem('preselect_challenge', JSON.stringify(ch));
    } catch (e) { /* ignore */ }
    track('challenge_started');
    go('worksheets');
  };
  return (
    <div className={`rounded-xl border p-5 ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`} data-testid="daily-challenge">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow-muted mb-1 inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Today's 5</div>
          <div className="text-[15px] font-semibold text-slate-900">{ch.subject} · {ch.topics.join(' & ')}</div>
          <div className="text-[12.5px] text-slate-600 mt-0.5">{done ? `Done — ${done.correct}/${done.total} right. Back tomorrow with new topics.` : 'Five quick questions on what needs the most work. Takes about 5 minutes.'}</div>
        </div>
        {streak > 0 && <span className="text-[12px] font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded-md whitespace-nowrap">{streak}-day run</span>}
      </div>
      {done ? (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-emerald-800 font-medium"><Check className="w-4 h-4" /> Completed today</div>
      ) : (
        <button onClick={start} className="btn-violet mt-3 px-4 py-2 rounded-lg text-[13px] font-semibold" data-testid="daily-challenge-start">Start today's 5</button>
      )}
    </div>
  );
}
