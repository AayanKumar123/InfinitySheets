import React, { useMemo, useState } from 'react';
import { Timer, ChevronDown, RotateCcw, Shuffle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { analyticsInsights, fmtMs } from '../../lib/worksheetAnalytics';

/**
 * "How you worked" — the worksheet analysis card. Shows where the time went
 * question by question, the headline numbers, and plain-language insights.
 *
 *   sheet    — a finished worksheet record with `analytics` attached
 *   compact  — collapsed by default (for history lists)
 */
export default function WorksheetAnalysis({ sheet, compact = false, testid = 'ws-analysis' }) {
  const a = sheet?.analytics;
  const [open, setOpen] = useState(!compact);
  const insights = useMemo(() => analyticsInsights(a), [a]);
  if (!a || !a.perQuestion?.length) return null;

  const max = Math.max(1, ...a.perQuestion.map((p) => p.timeMs));
  const expected = a.expectedMsPerQuestion;

  const tiles = [
    { label: 'Active time', value: fmtMs(a.totalActiveMs), sub: a.allottedMs ? `of ${fmtMs(a.allottedMs)}` : null },
    { label: 'Per question', value: fmtMs(a.avgMs), sub: expected ? `exam pace ${fmtMs(expected)}` : null },
    { label: 'Longest', value: fmtMs(a.maxMs), sub: `Q${a.perQuestion.reduce((m, p) => (p.timeMs > m.timeMs ? p : m)).i + 1}` },
    { label: 'Changed answers', value: String(a.changedCount), sub: a.changedRightToWrong ? `${a.changedRightToWrong} right → wrong` : a.changedWrongToRight ? `${a.changedWrongToRight} wrong → right` : null },
  ];

  const Icon = ({ tone }) => tone === 'warn' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : tone === 'good' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Info className="w-4 h-4 text-sky-600" />;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white" data-testid={testid}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={`w-full text-left px-5 pt-4 ${open ? 'pb-3 border-b border-[color:var(--color-border)]' : 'pb-4'} flex items-start gap-3`}>
        <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <Timer className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900">How you worked</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5">
            {fmtMs(a.totalActiveMs)} active · {fmtMs(a.avgMs)} a question · {a.revisited} revisited · {a.changedCount} changed
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl bg-slate-50 border border-[color:var(--color-border)] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">{t.label}</div>
                <div className="text-[18px] font-semibold text-slate-900 tabular-nums">{t.value}</div>
                {t.sub && <div className="text-[11.5px] text-slate-500">{t.sub}</div>}
              </div>
            ))}
          </div>

          {/* Time-per-question graph: where the clock went, in order */}
          <TimeGraph per={a.perQuestion} expected={expected} avg={a.avgMs} testid={`${testid}-graph`} />

          {/* Per-question time bars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12.5px] font-semibold text-slate-700">Time per question</div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> right</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> wrong</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> blank</span>
              </div>
            </div>
            <div className="space-y-1.5" data-testid={`${testid}-bars`}>
              {a.perQuestion.map((p) => {
                const pct = Math.max(2, (p.timeMs / max) * 100);
                const colour = !p.answered ? 'bg-slate-300' : p.correct ? 'bg-emerald-500' : 'bg-rose-500';
                const over = expected > 0 && p.timeMs > expected * 1.5;
                return (
                  <div key={p.i} className="flex items-center gap-2 text-[12px]">
                    <span className="w-8 shrink-0 text-slate-500 tabular-nums">Q{p.i + 1}</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden relative">
                      <div className={`h-full rounded ${colour}`} style={{ width: `${pct}%` }} />
                      {expected > 0 && expected < max && (
                        <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-400" style={{ left: `${(expected / max) * 100}%` }} title="Exam pace" />
                      )}
                    </div>
                    <span className={`w-14 shrink-0 text-right tabular-nums ${over ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}>{fmtMs(p.timeMs)}</span>
                    <span className="w-12 shrink-0 flex items-center gap-1 text-slate-400">
                      {p.visits > 1 && <span title={`Visited ${p.visits} times`} className="inline-flex items-center gap-0.5"><RotateCcw className="w-3 h-3" />{p.visits}</span>}
                      {p.changedFromFirst && <span title={p.firstCorrect === true && !p.correct ? 'Changed a right answer to a wrong one' : p.firstCorrect === false && p.correct ? 'Changed a wrong answer to a right one' : 'Changed answer'}><Shuffle className={`w-3 h-3 ${p.firstCorrect === true && !p.correct ? 'text-rose-500' : p.firstCorrect === false && p.correct ? 'text-emerald-600' : ''}`} /></span>}
                    </span>
                  </div>
                );
              })}
            </div>
            {expected > 0 && expected < max && <div className="text-[11px] text-slate-500 mt-1.5">Dashed line = the time each question gets in the real exam ({fmtMs(expected)}).</div>}
          </div>

          {/* Insights */}
          <div className="space-y-2" data-testid={`${testid}-insights`}>
            <div className="text-[12.5px] font-semibold text-slate-700">What this says</div>
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${ins.tone === 'warn' ? 'bg-amber-50 text-amber-800' : ins.tone === 'good' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                <span className="mt-0.5 shrink-0"><Icon tone={ins.tone} /></span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>

          {a.hiddenMs > 5000 && (
            <div className="text-[11.5px] text-slate-500">You were away from the tab for {fmtMs(a.hiddenMs)}; that time isn't counted above.</div>
          )}
        </div>
      )}
    </div>
  );
}


// Line + area graph of seconds spent on each question, with the average and
// the exam-pace line for reference. Points are coloured by correctness.
function TimeGraph({ per, expected, avg, testid }) {
  const W = 640; const H = 190; const PL = 44; const PR = 14; const PT = 14; const PB = 30;
  const n = per.length;
  const maxMs = Math.max(1000, ...per.map((p) => p.timeMs), expected || 0, avg || 0) * 1.08;
  const x = (i) => (n === 1 ? (PL + W - PR) / 2 : PL + (i / (n - 1)) * (W - PL - PR));
  const y = (ms) => PT + (1 - ms / maxMs) * (H - PT - PB);
  const path = per.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.timeMs).toFixed(1)}`).join(' ');
  const area = `${path} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxMs);
  const colour = (p) => (!p.answered ? '#94a3b8' : p.correct ? '#10b981' : '#f43f5e');
  return (
    <div data-testid={testid}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[12.5px] font-semibold text-slate-700">Time spent on each question</div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2 border-dashed border-amber-500" /> exam pace</span>
          <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2 border-dotted border-slate-400" /> your average</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Time spent per question">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-slate-200" strokeWidth="1" />
            <text x={PL - 6} y={y(t) + 3.5} fontSize="10" textAnchor="end" className="fill-slate-500">{fmtMs(t)}</text>
          </g>
        ))}
        <path d={area} fill="#3b82f6" fillOpacity="0.12" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        {expected > 0 && expected < maxMs && <line x1={PL} x2={W - PR} y1={y(expected)} y2={y(expected)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 4" />}
        {avg > 0 && <line x1={PL} x2={W - PR} y1={y(avg)} y2={y(avg)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 3" />}
        {per.map((p, i) => (
          <g key={p.i}>
            <circle cx={x(i)} cy={y(p.timeMs)} r={p.visits > 1 ? 6 : 4.5} fill={colour(p)} stroke="#fff" strokeWidth="1.5">
              <title>{`Q${p.i + 1} · ${fmtMs(p.timeMs)} · ${p.answered ? (p.correct ? 'right' : 'wrong') : 'blank'}${p.visits > 1 ? ` · visited ${p.visits}×` : ''}${p.changedFromFirst ? ' · changed answer' : ''}`}</title>
            </circle>
            <text x={x(i)} y={H - 10} fontSize="10" textAnchor="middle" className="fill-slate-500">Q{p.i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="text-[11px] text-slate-500 mt-0.5">Bigger dots were visited more than once. Peaks above the dashed line are where the exam clock would have run out.</div>
    </div>
  );
}
