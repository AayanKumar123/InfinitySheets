import React from 'react';
import { boardName } from '../../lib/subjects';

/**
 * Board-aware summary of a student's predicted grade across every subject they
 * have studied. Subjects are grouped by the BOARD of the course they belong to
 * (CBSE, IB, IGCSE, ...), and each board is summarised in its own format —
 * because grades from different boards are not comparable and must never be
 * mixed into one number. A CBSE + IB student therefore sees e.g.
 * "CBSE 99% · IB 7×3 6×3" as two separate lines.
 *
 *   CBSE / ICSE    → average of that board's subjects' predicted %
 *   IGCSE / AS-A   → count of subjects at each letter grade (A*, A, ...)
 *   IB             → count of subjects at each 1-7 grade
 *   Everything else (SSLC, SAT, JEE, NEET, LSAT, custom)
 *                  → count of subjects in each 10-point % band
 *
 * Props:
 *   predictedBySubject  {subject: { predicted, grade, count }}  (grade already
 *                        formatted with that subject's own board)
 *   visibleSubjects     string[] — subjects to include
 *   examTrack           fallback board for subjects with no course board
 *   subjectBoards       {subject: { board }} — a subject's actual course board
 *   label / footer      chrome
 */

const IGCSE_GRADE_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'U'];
const IB_GRADE_ORDER = [7, 6, 5, 4, 3, 2, 1];
const PERCENT_BUCKETS = [
  { key: '90+', min: 90, max: 101, label: '\u2265 90%' },
  { key: '80s', min: 80, max: 90, label: '80\u201389%' },
  { key: '70s', min: 70, max: 80, label: '70\u201379%' },
  { key: '60s', min: 60, max: 70, label: '60\u201369%' },
  { key: '50s', min: 50, max: 60, label: '50\u201359%' },
  { key: '<50', min: 0, max: 50, label: '&lt; 50%' },
];

function CountRow({ entries }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {entries.map((e) => (
        <div key={e.key} className="inline-flex items-baseline gap-1">
          <span className="text-[20px] font-semibold text-slate-900 tabular-nums leading-none">{e.count}</span>
          {e.html ? (
            <span className="text-[13px] font-semibold text-slate-600 leading-none" dangerouslySetInnerHTML={{ __html: e.label }} />
          ) : (
            <span className="text-[13px] font-semibold text-slate-600 leading-none">{e.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Inner summary (value + subtext) for a single board's subjects.
function BoardSummary({ track, scored, compact }) {
  const t = (track || '').toUpperCase();
  let value;
  let sub;

  if (t === 'CBSE' || t === 'ICSE') {
    const avg = Math.round(scored.reduce((s, p) => s + p.predicted, 0) / scored.length);
    value = <div className={`${compact ? 'text-[20px]' : 'text-[26px]'} font-semibold text-slate-900 tabular-nums leading-none`}>{avg}%</div>;
    sub = `Average across ${scored.length} subject${scored.length === 1 ? '' : 's'}.`;
  } else if (t === 'IGCSE' || t === 'ASA') {
    const counts = {};
    scored.forEach((p) => { const g = p.grade?.label || '\u2014'; counts[g] = (counts[g] || 0) + 1; });
    const entries = IGCSE_GRADE_ORDER.filter((g) => counts[g]).map((g) => ({ key: g, count: counts[g], label: g }));
    value = <CountRow entries={entries} />;
    sub = `Across ${scored.length} subject${scored.length === 1 ? '' : 's'} \u00b7 predicted ${t === 'ASA' ? 'A Level' : 'IGCSE'} grade.`;
  } else if (t === 'IB') {
    const counts = {};
    scored.forEach((p) => { const g = p.grade?.label ? parseInt(p.grade.label, 10) : null; if (g && !Number.isNaN(g)) counts[g] = (counts[g] || 0) + 1; });
    const entries = IB_GRADE_ORDER.filter((g) => counts[g]).map((g) => ({ key: g, count: counts[g], label: `${g}${counts[g] === 1 ? '' : 's'}` }));
    value = <CountRow entries={entries} />;
    sub = `Across ${scored.length} subject${scored.length === 1 ? '' : 's'} \u00b7 predicted IB grade (1\u20137).`;
  } else {
    const entries = PERCENT_BUCKETS
      .map((b) => ({ key: b.key, count: scored.filter((p) => p.predicted >= b.min && p.predicted < b.max).length, label: b.label, html: true }))
      .filter((b) => b.count > 0);
    value = <CountRow entries={entries} />;
    sub = `Across ${scored.length} subject${scored.length === 1 ? '' : 's'}.`;
  }

  return (
    <div>
      <div className={compact ? 'mt-0.5' : 'mt-1'}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

export default function PredictedScoreMini({ predictedBySubject, visibleSubjects, examTrack, subjectBoards, label = 'Predicted score', footer = null }) {
  const boardOf = (s) => (subjectBoards?.[s]?.board || examTrack || '').toString();

  const scored = (visibleSubjects || [])
    .map((s) => { const p = predictedBySubject?.[s]; return p && p.count > 0 ? { ...p, subject: s, board: boardOf(s) } : null; })
    .filter(Boolean);

  if (scored.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-4">
        <div className="eyebrow-muted">{label}</div>
        <div className="text-[20px] font-semibold mt-1 text-slate-400">&mdash;</div>
        <div className="text-[11px] text-slate-500 mt-1">Complete a worksheet in any subject to unlock.</div>
        {footer}
      </div>
    );
  }

  // Group subjects by board, preserving first-seen order.
  const order = [];
  const groups = {};
  scored.forEach((p) => {
    const b = p.board;
    if (!groups[b]) { groups[b] = []; order.push(b); }
    groups[b].push(p);
  });

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-4" data-testid="predicted-grade-tile">
      <div className="eyebrow-muted">{label}</div>
      {order.length === 1 ? (
        <BoardSummary track={order[0]} scored={groups[order[0]]} />
      ) : (
        <div className="mt-1 flex flex-col divide-y divide-[color:var(--color-border)]">
          {order.map((b) => (
            <div key={b} className="py-2 first:pt-0 last:pb-0" data-testid={`predicted-board-${b}`}>
              <div className="text-[10px] tracking-[0.12em] uppercase font-semibold text-blue-700 mb-0.5">{boardName(b)}</div>
              <BoardSummary track={b} scored={groups[b]} compact />
            </div>
          ))}
        </div>
      )}
      {footer}
    </div>
  );
}
