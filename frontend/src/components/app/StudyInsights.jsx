import React, { useMemo } from 'react';
import { CalendarDays, Flame, RotateCcw, TrendingDown, TrendingUp, Minus, Timer, Sparkles, ArrowRight } from 'lucide-react';
import { bestProjection } from '../../lib/streakProjection';
import { weeklySummary, activityCalendar, timingTrends } from '../../lib/studyStats';
import { buildReviewQueue } from '../../lib/spacedRepetition';
import { fmtMs } from '../../lib/worksheetAnalytics';

const pct = (x) => `${Math.round((x || 0) * 100)}%`;

function Delta({ value, format = (v) => v, invert = false, suffix = '' }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <span className="text-slate-400">—</span>;
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 1e-9;
  const Icon = flat ? Minus : good ? TrendingUp : TrendingDown;
  const cls = flat ? 'text-slate-500' : good ? 'text-emerald-700' : 'text-rose-600';
  return <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-semibold ${cls}`}><Icon className="w-3.5 h-3.5" />{value > 0 ? '+' : ''}{format(value)}{suffix}</span>;
}

/** Dashboard card: this week vs last week. */
export function WeeklySummaryCard({ worksheets }) {
  const w = useMemo(() => weeklySummary(worksheets), [worksheets]);
  const t = w.thisWeek;
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white" data-testid="weekly-summary">
      <div className="eyebrow-muted mb-3 flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-blue-600" /> This week</div>
      {w.empty ? (
        <div className="text-[13px] text-slate-500">No worksheets in the last 7 days yet. One sheet is enough to start the summary.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[20px] font-semibold text-slate-900 tabular-nums">{t.sheets}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Sheets</div>
              <Delta value={w.deltas.sheets} />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-slate-900 tabular-nums">{t.questions}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Questions</div>
              <Delta value={w.deltas.questions} />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-slate-900 tabular-nums">{t.accuracy === null ? '—' : pct(t.accuracy)}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Accuracy</div>
              <Delta value={w.deltas.accuracy === null ? null : w.deltas.accuracy * 100} format={(v) => Math.round(v)} suffix=" pts" />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-slate-900 tabular-nums">{t.paceMs ? fmtMs(t.paceMs) : '—'}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Per question</div>
              <Delta value={w.deltas.paceMs === null ? null : w.deltas.paceMs / 1000} format={(v) => `${Math.round(v)}s`} invert />
            </div>
          </div>
          {(w.improved || w.weakest) && (
            <div className="mt-3 pt-3 border-t border-[color:var(--color-border)] flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
              {w.improved && <span className="text-slate-600">Most improved: <span className="font-semibold text-emerald-700">{w.improved.topic}</span> (+{Math.round(w.improved.delta * 100)} pts)</span>}
              {w.weakest && <span className="text-slate-600">Weakest: <span className="font-semibold text-rose-600">{w.weakest.topic}</span> ({pct(w.weakest.acc)})</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Dashboard card: GitHub-style activity heatmap + streak. */
export function StreakHeatmap({ worksheets, streak }) {
  const cal = useMemo(() => activityCalendar(worksheets, { weeks: 16 }), [worksheets]);
  const level = (d) => (d.future ? -1 : d.questions === 0 ? 0 : d.questions <= cal.max * 0.25 ? 1 : d.questions <= cal.max * 0.5 ? 2 : d.questions <= cal.max * 0.75 ? 3 : 4);
  const cls = ['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-700'];
  const months = [];
  cal.weeks.forEach((wk, i) => {
    const m = wk[0].date.toLocaleDateString(undefined, { month: 'short' });
    if (!months.length || months[months.length - 1].m !== m) months.push({ m, i });
  });
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white" data-testid="streak-heatmap">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="eyebrow-muted flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Study streak</div>
        <div className="text-[13px] text-slate-600"><span className="text-[18px] font-semibold text-slate-900 tabular-nums">{streak || 0}</span> day{streak === 1 ? '' : 's'} · {cal.activeDays} active in 16 weeks</div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-[3px] ml-7 mb-1 text-[10px] text-slate-500 relative h-3">
            {months.map((mo) => <span key={mo.m + mo.i} className="absolute" style={{ left: `${mo.i * 15}px` }}>{mo.m}</span>)}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] text-[9px] text-slate-400 w-6 shrink-0">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => <span key={i} className="h-3 leading-3">{d}</span>)}
            </div>
            {cal.weeks.map((wk, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {wk.map((d) => {
                  const l = level(d);
                  return <div key={d.key} title={d.future ? '' : `${d.date.toLocaleDateString()} · ${d.count} sheet${d.count === 1 ? '' : 's'}, ${d.questions} questions`} className={`w-3 h-3 rounded-[2px] ${l < 0 ? 'bg-transparent' : cls[l]}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dashboard tile: spaced-repetition reviews due. */
export function ReviewDueTile({ worksheets, onStart }) {
  const q = useMemo(() => buildReviewQueue(worksheets), [worksheets]);
  const due = q.filter((r) => r.dueNow);
  const next = q.find((r) => !r.dueNow);
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white flex flex-col" data-testid="review-due">
      <div className="eyebrow-muted mb-2 flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-violet-600" /> Review due</div>
      <div className="text-[26px] font-semibold text-slate-900 tabular-nums leading-none">{due.length}</div>
      <div className="text-[12px] text-slate-500 mt-1.5 flex-1">
        {due.length
          ? `Question${due.length === 1 ? '' : 's'} you missed before, ready for their next spaced review${due.some((r) => r.overdueDays > 2) ? ' — some overdue' : ''}.`
          : next
            ? `Nothing due. Next review ${new Date(next.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.`
            : 'Miss a question and it comes back after 1, 3, 7 and 14 days.'}
      </div>
      {due.length > 0 && (
        <button onClick={onStart} className="mt-3 self-start text-[13px] font-semibold text-violet-700 hover:text-violet-900" data-testid="review-due-start">Start a review sheet &rarr;</button>
      )}
    </div>
  );
}

/** Performance card: pace by topic + pace vs accuracy scatter. */
export function TimingTrendsCard({ worksheets, subject }) {
  const t = useMemo(() => timingTrends(worksheets, { subject }), [worksheets, subject]);
  if (!t.count) {
    return (
      <div className="rounded-2xl border border-[color:var(--color-border)] p-5 bg-white" data-testid="timing-trends">
        <div className="eyebrow-muted flex items-center gap-1.5"><Timer className="w-4 h-4 text-sky-600" /> Timing trends</div>
        <div className="text-[13px] text-slate-500 mt-2">Finish a worksheet and its per-question timing shows up here: which topics slow you down, and whether speed is costing you accuracy.</div>
      </div>
    );
  }
  const maxTopic = Math.max(1, ...t.byTopic.map((x) => x.avgMs));
  // Scatter geometry
  const W = 520; const H = 200; const PL = 40; const PB = 28; const PT = 10; const PR = 10;
  const maxPace = Math.max(30000, ...t.points.map((p) => p.paceMs));
  const x = (ms) => PL + (ms / maxPace) * (W - PL - PR);
  const y = (acc) => PT + (1 - acc) * (H - PT - PB);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const xt = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxPace);
  // Simple over-time trend: first vs latest pace.
  const first = t.overTime[0]; const last = t.overTime[t.overTime.length - 1];
  const paceDelta = first && last && t.overTime.length > 1 ? last.paceMs - first.paceMs : null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] p-5 bg-white" data-testid="timing-trends">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="eyebrow-muted flex items-center gap-1.5"><Timer className="w-4 h-4 text-sky-600" /> Timing trends</div>
          <div className="text-[12px] text-slate-500 mt-1">From {t.count} timed worksheet{t.count === 1 ? '' : 's'}{subject ? ` in ${subject}` : ''}.{paceDelta !== null && <> Pace since your first timed sheet: <Delta value={paceDelta / 1000} format={(v) => `${Math.round(v)}s`} invert suffix=" per question" /></>}</div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <div className="text-[12.5px] font-semibold text-slate-700 mb-2">Average time per question, by topic</div>
          {t.byTopic.length === 0 ? <div className="text-[12.5px] text-slate-500">Need a couple more questions per topic.</div> : (
            <div className="space-y-1.5">
              {t.byTopic.slice(0, 8).map((row) => (
                <div key={row.topic} className="flex items-center gap-2 text-[12px]">
                  <span className="w-28 shrink-0 truncate text-slate-600" title={row.topic}>{row.topic}</span>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded overflow-hidden">
                    <div className={`h-full rounded ${row.accuracy >= 0.7 ? 'bg-emerald-500' : row.accuracy >= 0.4 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${Math.max(3, (row.avgMs / maxTopic) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right tabular-nums text-slate-700">{fmtMs(row.avgMs)}</span>
                  <span className="w-10 text-right tabular-nums text-slate-500">{pct(row.accuracy)}</span>
                </div>
              ))}
              <div className="text-[11px] text-slate-500 pt-1">Bar colour = accuracy on that topic. Slow <span className="text-rose-600 font-semibold">and</span> red is where to study; fast and red is where to slow down.</div>
            </div>
          )}
        </div>
        <div>
          <div className="text-[12.5px] font-semibold text-slate-700 mb-2">Pace vs accuracy, per worksheet</div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pace versus accuracy scatter">
            {ticks.map((tk) => <g key={tk}><line x1={PL} x2={W - PR} y1={y(tk)} y2={y(tk)} stroke="currentColor" className="text-slate-200" strokeWidth="1" /><text x={PL - 6} y={y(tk) + 3.5} fontSize="10" textAnchor="end" className="fill-slate-500">{Math.round(tk * 100)}%</text></g>)}
            {xt.map((v) => <text key={v} x={x(v)} y={H - 8} fontSize="10" textAnchor="middle" className="fill-slate-500">{fmtMs(v)}</text>)}
            {t.points.map((p) => (
              <circle key={p.id} cx={x(p.paceMs)} cy={y(p.accuracy)} r={Math.min(9, 4 + (p.n || 5) / 5)} className={p.accuracy >= 0.7 ? 'fill-emerald-500/70' : p.accuracy >= 0.4 ? 'fill-amber-400/70' : 'fill-rose-500/70'}>
                <title>{`${p.subject} · ${p.topic}\n${new Date(p.date).toLocaleDateString()} · ${fmtMs(p.paceMs)} per question · ${pct(p.accuracy)}`}</title>
              </circle>
            ))}
            <text x={(PL + W - PR) / 2} y={H - 18} fontSize="10" textAnchor="middle" className="fill-slate-400">seconds per question →</text>
          </svg>
          <div className="text-[11px] text-slate-500">Top-left is the goal: fast and accurate. Bottom-left means rushing; bottom-right means the topic itself is the problem.</div>
        </div>
      </div>
    </div>
  );
}


/** Dashboard card next to the streak heatmap: where the streak is taking you. */
export function StreakProjectionCard({ worksheets, subjects, boards, streak }) {
  const p = useMemo(() => bestProjection(worksheets, subjects, boards, { streak, weeks: 2 }), [worksheets, subjects, boards, streak]);
  const tone = p ? (p.tone === 'good' ? 'text-emerald-700' : p.tone === 'ok' ? 'text-amber-700' : 'text-rose-700') : '';
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white flex flex-col" data-testid="streak-projection">
      <div className="eyebrow-muted mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-600" /> If you keep this up</div>
      {!p ? (
        <div className="text-[13px] text-slate-500 flex-1">Finish two worksheets in a subject and this card projects the grade your streak is heading for.</div>
      ) : (
        <>
          <div className="flex items-end gap-3 mt-1">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Now</div>
              <div className="text-[22px] font-semibold text-slate-900 tabular-nums leading-none mt-0.5">{p.currentLabel}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 mb-1" />
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">In {p.weeks} weeks</div>
              <div className={`text-[22px] font-semibold tabular-nums leading-none mt-0.5 ${tone}`}>{p.projectedLabel}</div>
            </div>
          </div>
          <p className="text-[13px] text-slate-700 mt-3 leading-snug flex-1" data-testid="streak-projection-message">{p.message}</p>
          <div className="text-[11.5px] text-slate-500 mt-2">{p.subject} · {p.sheetsPerWeek} sheet{p.sheetsPerWeek === 1 ? '' : 's'}/week · about +{p.gainPerSheet} pts a sheet{p.nextBoundary && !p.crosses && p.weeksToNext ? ` · ${p.nextBoundary.label} in ~${p.weeksToNext}w` : ''}</div>
        </>
      )}
    </div>
  );
}
