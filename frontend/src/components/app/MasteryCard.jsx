import React, { useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { computeMastery, masteryForSubject, subjectMasterySummary, LEVELS } from '../../lib/mastery';

// Topic mastery per subject: Not started → Novice → Learning → Solid →
// Mastered, from accuracy × evidence × recency (lib/mastery.js).
export default function MasteryCard({ worksheets, subjects, topicsFor, go }) {
  const [subject, setSubject] = useState(subjects[0] || '');
  const active = subjects.includes(subject) ? subject : subjects[0];
  const mastery = useMemo(() => computeMastery(worksheets), [worksheets]);
  const rows = useMemo(() => (active ? masteryForSubject(mastery, active, topicsFor(active)) : []), [mastery, active, topicsFor]);
  const summary = useMemo(() => subjectMasterySummary(rows), [rows]);
  if (!subjects.length) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="mastery">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow-muted mb-0.5 inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Topic mastery</div>
          <div className="text-[15px] font-semibold text-slate-900">{active} · {summary.avg}/100 average</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{LEVELS.slice(1).map((l) => `${summary.counts[l.key] || 0} ${l.label.toLowerCase()}`).join(' · ')}</div>
        </div>
        {subjects.length > 1 && (
          <select className="input-base w-auto py-1.5" value={active} onChange={(e) => setSubject(e.target.value)} data-testid="mastery-subject">
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <button key={r.topic} type="button" onClick={() => go(`topic?subject=${encodeURIComponent(active)}&topic=${encodeURIComponent(r.topic)}`)} className="w-full text-left flex items-center gap-3 group" title={r.n ? `${r.n} answered · ${r.accuracy}% overall · ${r.recentAccuracy}% recently` : 'Not practised yet'}>
            <span className="text-[12.5px] text-slate-700 w-[42%] truncate group-hover:text-violet-800">{r.topic}</span>
            <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><span className={`block h-full rounded-full ${r.level.cls}`} style={{ width: `${Math.max(2, r.score)}%` }} /></span>
            <span className={`text-[11px] font-semibold w-[76px] text-right ${r.level.key === 'mastered' ? 'text-emerald-700' : r.level.key === 'solid' ? 'text-sky-700' : r.level.key === 'learning' ? 'text-amber-700' : r.level.key === 'novice' ? 'text-rose-700' : 'text-slate-400'}`}>{r.level.label}</span>
          </button>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 mt-3">Mastery needs volume, accuracy and recent practice — a topic fades if it is left for months. Tap a topic for its overview.</div>
    </div>
  );
}
