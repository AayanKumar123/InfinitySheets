import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBJECT_INFO } from '../../data/mock';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import EmptyStateScene from '../decor/EmptyStateScene';
import { predictedScore, predictedBreakdown, formatGrade, TONE_CLASSES, isGradedTrack } from '../../lib/predictedGrade';
import { subjectBoards } from '../../lib/subjects';
import { useStrengthsWeaknesses, useSavedSwOverridesFor, useSavedSwPrefs, computeSw, pickOverridesFor } from '../../hooks/useStrengthsWeaknesses';
import PredictedScoreMini from './PredictedScoreMini';

const SUBJECT_COLORS = [
  '#2563eb', '#7c3aed', '#dc2626', '#10b981',
  '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#14b8a6',
];

// Predicted-score model is now shared with the Strengths page.
// See /app/frontend/src/lib/predictedGrade.js.
function predictedFromList(list) {
  return predictedScore(list);
}

export default function ProgressView() {
  const { state } = useApp();
  // Memoised: a fresh `[]` fallback each render would invalidate every useMemo below.
  const ws = useMemo(() => state.worksheets || [], [state.worksheets]);
  const examTrack = state.user?.examTrack || 'CBSE';
  // A subject's grade format follows the board of the course it belongs to
  // (a CBSE + IB student gets a % for one and a 1-7 grade for the other).
  const subjBoards = useMemo(() => subjectBoards(state.courses, examTrack), [state.courses, examTrack]);
  const boardOf = useCallback((sub) => subjBoards[sub]?.board || examTrack, [subjBoards, examTrack]);

  const allSubjects = useMemo(() => Array.from(new Set(ws.map((w) => w.subject))), [ws]);
  const boardsInPlay = useMemo(() => Array.from(new Set(allSubjects.map(boardOf))), [allSubjects, boardOf]);
  // Clicking a subject isolates it: that line alone stays on the chart.
  // Clicking the same subject again (or "Show all") brings the rest back.
  const [solo, setSolo] = useState(null);
  const [hoveredSubject, setHoveredSubject] = useState(null);
  const [focusedSubject, setFocusedSubject] = useState(null); // set briefly on click for a flash-highlight
  const cardsSectionRef = useRef(null);
  const soloed = solo && allSubjects.includes(solo) ? solo : null;
  const isHidden = (s) => soloed !== null && soloed !== s;
  const visibleSubjects = useMemo(
    () => (soloed ? [soloed] : allSubjects),
    [soloed, allSubjects],
  );

  // Full prefs (both global and per-subject overrides).
  const swPrefs = useSavedSwPrefs();

  // Chronological order (oldest first)
  const chronological = useMemo(() => [...ws].slice().reverse(), [ws]);
  const visibleWS = useMemo(
    () => chronological.filter((w) => visibleSubjects.includes(w.subject)),
    [chronological, visibleSubjects]
  );

  // Per-subject series (each point is a worksheet attempt)
  const series = useMemo(() => {
    const m = {};
    visibleSubjects.forEach((s) => { m[s] = []; });
    chronological.forEach((w, i) => {
      if (!visibleSubjects.includes(w.subject)) return;
      m[w.subject].push({ x: i, score: w.score, date: w.date, topic: w.topic, difficulty: w.difficulty });
    });
    return m;
  }, [chronological, visibleSubjects]);

  // Percentage improvement: (last - first) percentage points
  const deltas = useMemo(() => {
    const out = {};
    Object.entries(series).forEach(([s, points]) => {
      if (points.length < 2) { out[s] = { delta: 0, hasEnough: false, first: points[0]?.score, last: points[points.length - 1]?.score }; return; }
      const first = points[0].score;
      const last = points[points.length - 1].score;
      out[s] = { delta: last - first, hasEnough: true, first, last };
    });
    return out;
  }, [series]);

  // Per-subject rich detail: predicted breakdown, latest / best scores, and
  // strengths / weaknesses (computed with per-subject overrides, independent
  // from global). Centralized so LineChart, hover cards, and subject cards
  // all read the same data.
  const subjectDetails = useMemo(() => {
    const map = {};
    allSubjects.forEach((s) => {
      const list = ws.filter((w) => w.subject === s);
      if (list.length === 0) {
        map[s] = null; return;
      }
      const bd = predictedBreakdown(list);
      const board = boardOf(s);
      const grade = formatGrade(bd.score, board);
      // Best (max score) and latest (most recent) worksheet.
      const best = list.reduce((m, w) => (w.score > m.score ? w : m), list[0]);
      const latest = [...list].sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      })[0];
      const sw = computeSw(list, pickOverridesFor(swPrefs, s));
      map[s] = { bd, grade, board, best, latest, sw, count: list.length };
    });
    return map;
  }, [ws, allSubjects, boardOf, swPrefs]);

  // Convenience: predictedBySubject (subset of subjectDetails filtered to visible)
  const predictedBySubject = useMemo(() => {
    const map = {};
    visibleSubjects.forEach((s) => {
      const d = subjectDetails[s];
      map[s] = d
        ? { predicted: d.bd.score, count: d.count, grade: d.grade }
        : { predicted: 0, count: 0, grade: formatGrade(0, boardOf(s)) };
    });
    return map;
  }, [visibleSubjects, subjectDetails, boardOf]);

  // Click a subject line/label → scroll to the cards section and briefly
  // highlight the matching subject card.
  const scrollToSubject = useCallback((s) => {
    if (cardsSectionRef.current) {
      cardsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setFocusedSubject(s);
    // Clear the focus ring after ~2.5s
    setTimeout(() => setFocusedSubject((cur) => (cur === s ? null : cur)), 2500);
  }, []);

  if (ws.length === 0) {
    return (
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
        <EmptyStateScene variant="both" className="absolute inset-0" />
        <div className="relative p-12 text-center">
          <div className="text-[15px] font-semibold text-slate-700">No progress data yet</div>
          <div className="text-[13px] text-slate-500 mt-1">Complete a worksheet to start drawing your improvement line.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <PredictedScoreMini predictedBySubject={predictedBySubject} visibleSubjects={visibleSubjects} examTrack={examTrack} subjectBoards={subjBoards} />
        <Mini label="Worksheets" value={visibleWS.length} />
        <Mini label="Questions" value={visibleWS.reduce((s, x) => s + x.total, 0)} />
      </div>

      <div className="rounded-2xl border border-[color:var(--color-border)] p-5 bg-white">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="eyebrow-muted">Score trend over time</div>
            <div className="text-[12px] text-slate-500 mt-1">
              Solid line = your worksheet performance. Dashed line = predicted grade.
              Click a subject to see it on its own.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {soloed ? (
              <button onClick={() => setSolo(null)} className="text-[12px] font-medium text-blue-700 hover:text-blue-900 transition-colors" data-testid="progress-show-all">
                Showing {soloed} only &middot; Show all
              </button>
            ) : (
              <span className="text-[12px] text-slate-500">Click a subject to see it on its own</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {allSubjects.map((s, i) => {
            const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            const off = isHidden(s);
            const info = SUBJECT_INFO[s] || { emoji: '\u25A0' };
            const d = deltas[s] || {};
            const isHovered = hoveredSubject === s;
            const dimmed = !!hoveredSubject && !isHovered && !off;
            return (
              <button
                key={s}
                onClick={() => setSolo((cur) => (cur === s ? null : s))}
                data-testid={`progress-subject-${s}`}
                aria-pressed={soloed === s}
                onMouseEnter={() => !off && setHoveredSubject(s)}
                onMouseLeave={() => setHoveredSubject(null)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] font-medium border transition-all ${
                  off
                    ? 'bg-slate-50 text-slate-400 border-[color:var(--color-border)] opacity-70'
                    : soloed === s
                      ? 'bg-blue-50 text-blue-900 border-blue-400 ring-2 ring-blue-100'
                    : isHovered
                      ? 'bg-white text-slate-900 border-slate-400 ring-2 ring-blue-100'
                      : dimmed
                        ? 'bg-white/60 text-slate-400 border-[color:var(--color-border)] opacity-60'
                        : 'bg-white text-slate-800 border-[color:var(--color-border)] hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: off ? '#cbd5e1' : color }} />
                <span className="text-[14px] leading-none">{info.emoji}</span>
                <span>{s}</span>
                {!off && d.hasEnough && <DeltaPill delta={d.delta} small />}
              </button>
            );
          })}
        </div>

        {/* Line-style legend */}
        <div className="flex flex-wrap items-center gap-4 mb-3 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden>
              <line x1="1" y1="4" x2="25" y2="4" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            Worksheet performance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden>
              <line x1="1" y1="4" x2="25" y2="4" stroke="#334155" strokeWidth="1.6" strokeDasharray="4 3" />
              <circle cx="23" cy="4" r="2.6" fill="white" stroke="#334155" strokeWidth="1.6" />
            </svg>
            Predicted grade
          </span>
        </div>

        <LineChart
          series={series}
          subjects={visibleSubjects}
          allSubjects={allSubjects}
          predictedBySubject={predictedBySubject}
          subjectDetails={subjectDetails}
          hoveredSubject={hoveredSubject}
          onHoverSubject={setHoveredSubject}
          onSubjectClick={scrollToSubject}
          examTrack={examTrack}
        />
      </div>

      <div ref={cardsSectionRef} className="rounded-2xl border border-[color:var(--color-border)] p-5 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="eyebrow-muted">Predicted grade per subject</div>
            <div className="text-[12px] text-slate-500 mt-0.5">
              {boardsInPlay.length > 1
                ? 'Each subject is graded in its own board\u2019s format, heavily biased toward your most recent worksheet and adjusted for its difficulty.'
                : isGradedTrack(boardsInPlay[0] || examTrack)
                  ? `${(boardsInPlay[0] || examTrack).toUpperCase()}-style grade, heavily biased toward your most recent worksheet and adjusted for its difficulty.`
                  : 'Heavily biased toward your most recent worksheet and adjusted for its difficulty.'}
              <span className="ml-1 text-emerald-700">
                An extra upward nudge is applied when you&rsquo;re improving.
              </span>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        {visibleSubjects.length === 0 ? (
          <div className="text-[13px] text-slate-500">No subjects visible.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleSubjects.map((s) => (
              <SubjectPredictedRow
                key={s}
                s={s}
                color={SUBJECT_COLORS[allSubjects.indexOf(s) % SUBJECT_COLORS.length]}
                info={SUBJECT_INFO[s] || { emoji: '\u25A0' }}
                p={predictedBySubject[s] || { predicted: 0, count: 0, grade: null }}
                d={deltas[s] || {}}
                ws={ws}
                isHovered={hoveredSubject === s}
                dimmed={!!hoveredSubject && hoveredSubject !== s}
                onHover={setHoveredSubject}
                isFocused={focusedSubject === s}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Row rendering a single subject's predicted grade + progress bar + S/W counts
// and richer stats (best, latest, improvement bonus). Split out so we can
// call the useStrengthsWeaknesses hook per subject (hooks can't be conditional).
function SubjectPredictedRow({ s, color, info, p, d, ws, isHovered, dimmed, onHover }) {
  const subjectWs = useMemo(() => ws.filter((w) => w.subject === s), [ws, s]);
  const subjOverrides = useSavedSwOverridesFor(s);
  const { strengths, weaknesses, strengthMin, weaknessMax, isCustom } = useStrengthsWeaknesses(subjectWs, subjOverrides);

  // Extra stats: best score, latest score/topic/date, improvement bonus.
  const stats = useMemo(() => {
    if (subjectWs.length === 0) return null;
    const best = subjectWs.reduce((m, w) => (w.score > m.score ? w : m), subjectWs[0]);
    const sortedByDate = [...subjectWs].sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
    const latest = sortedByDate[0];
    const bd = predictedBreakdown(subjectWs);
    return { best, latest, bd };
  }, [subjectWs]);

  const noPred = p.count === 0;
  const tone = TONE_CLASSES[p.grade?.tone] || TONE_CLASSES.ok;

  // The whole card opens that subject's overview.
  const openSubject = () => {
    window.location.hash = `#study?subject=${encodeURIComponent(s)}`;
  };

  return (
    <button
      type="button"
      onClick={openSubject}
      data-testid={`predicted-row-${s}`}
      aria-label={`Open ${s} subject overview`}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-all cursor-pointer hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        isHovered
          ? `${tone.border} ring-2 ring-blue-100 bg-white`
          : dimmed
            ? 'border-[color:var(--color-border)] bg-white opacity-60'
            : 'border-[color:var(--color-border)] bg-white'
      }`}
      onMouseEnter={() => onHover && onHover(s)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-[14.5px]">{info.emoji}</span>
          <span className="text-[14px] font-semibold text-slate-900">{s}</span>
          <span className="text-[11px] text-slate-500">· {p.count} {p.count === 1 ? 'attempt' : 'attempts'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">
              {p.grade?.sub || 'Predicted'}
            </div>
            <div className={`text-[18px] font-semibold ${tone.text} tabular-nums leading-tight`}>
              {noPred ? '\u2014' : (p.grade?.label ?? `${p.predicted}%`)}
            </div>
          </div>
          {d.hasEnough ? <DeltaPill delta={d.delta} /> : <span className="text-[11.5px] text-slate-400">2+ needed</span>}
        </div>
      </div>
      {noPred ? null : (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${p.predicted}%`, background: color }} />
          </div>

          {/* Rich stats row — visible always, extra hint when improvement bonus applied. */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11.5px] text-slate-600">
            {stats?.latest && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Latest</div>
                <div className="tabular-nums font-medium text-slate-800">{stats.latest.score}%</div>
                <div className="text-slate-400 truncate">{stats.latest.topic}</div>
              </div>
            )}
            {stats?.best && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Best</div>
                <div className="tabular-nums font-medium text-slate-800">{stats.best.score}%</div>
                <div className="text-slate-400 truncate">{stats.best.topic}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Base</div>
              <div className="tabular-nums font-medium text-slate-800">{stats?.bd.baseScore ?? 0}%</div>
              {stats?.bd.hasImprovement ? (
                <div className="text-emerald-600 tabular-nums font-medium">+{stats.bd.improvementBonus} improvement</div>
              ) : (
                <div className="text-slate-400">no bonus</div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Topics</div>
              <div className="text-slate-800">
                <span className="tabular-nums font-medium text-blue-700">{strengths.length}</span> strong
                <span className="text-slate-400 mx-1">·</span>
                <span className="tabular-nums font-medium text-rose-600">{weaknesses.length}</span> weak
              </div>
              <div className="text-slate-400 tabular-nums">≥ {strengthMin}% / &lt; {weaknessMax}%</div>
            </div>
          </div>
          {isCustom && (
            <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-medium">
              Custom thresholds for {s}
            </div>
          )}
        </>
      )}
    </button>
  );
}

function LineChart({ series, subjects, allSubjects, predictedBySubject, subjectDetails, hoveredSubject, onHoverSubject, onSubjectClick, examTrack }) {
  const w = 780, h = 300, padL = 36, padR = 90, padT = 16, padB = 30; // extra right padding for end-labels
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const containerRef = useRef(null);
  const [pointHover, setPointHover] = useState(null); // { subject, topic, score, date, difficulty, x, y }
  const [lineHover, setLineHover] = useState(null);   // { subject, x, y }

  const posFromEvent = (e) => {
    const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // x range across visible points: 0..maxLen
  const maxLen = Math.max(0, ...subjects.map((s) => (series[s]?.length || 0)));
  if (maxLen === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[13px] text-slate-500 border border-dashed border-[color:var(--color-border)] rounded-xl">
        No data for the selected subjects. Toggle a chip to add subjects back.
      </div>
    );
  }
  const denom = Math.max(1, maxLen - 1);
  const xFor = (i) => padL + (i / denom) * innerW;
  const yFor = (v) => padT + innerH - (v / 100) * innerH;

  const dimOthers = !!hoveredSubject;
  const opacityFor = (s) => (dimOthers && s !== hoveredSubject) ? 0.15 : 1;

  const clearAll = () => {
    setPointHover(null);
    setLineHover(null);
    onHoverSubject && onHoverSubject(null);
  };

  const handleLineClick = (s) => {
    onSubjectClick && onSubjectClick(s);
  };

  // Choose which subject's card to render for line-hover (skip if a point is hovered).
  const activeLineSubject = !pointHover && lineHover ? lineHover.subject : null;
  const activePos = pointHover || lineHover;

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto min-w-[640px]" onMouseLeave={clearAll}>
        {[0, 25, 50, 75, 100].map((g) => {
          const y = yFor(g);
          return (
            <g key={g}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#eef2f7" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{g}</text>
            </g>
          );
        })}

        {/* x ticks */}
        {Array.from({ length: maxLen }).map((_, i) => (
          <text key={i} x={xFor(i)} y={h - 10} textAnchor="middle" fontSize="9" fill="#94a3b8">{`#${i + 1}`}</text>
        ))}

        {/* per-subject historical lines */}
        {subjects.map((s) => {
          const pts = series[s] || [];
          if (pts.length === 0) return null;
          const color = SUBJECT_COLORS[allSubjects.indexOf(s) % SUBJECT_COLORS.length];
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.score).toFixed(1)}`).join(' ');
          const op = opacityFor(s);
          return (
            <g
              key={s}
              style={{ opacity: op, transition: 'opacity 160ms ease' }}
              onMouseEnter={(e) => {
                onHoverSubject && onHoverSubject(s);
                setLineHover({ subject: s, ...posFromEvent(e) });
              }}
              onMouseMove={(e) => setLineHover({ subject: s, ...posFromEvent(e) })}
              onMouseLeave={() => setLineHover(null)}
              onClick={() => handleLineClick(s)}
              className="cursor-pointer"
            >
              {/* Invisible thick hit-target for easier hover */}
              <path d={path} fill="none" stroke="transparent" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
              <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle
                  key={`${s}-${i}`}
                  cx={xFor(i)}
                  cy={yFor(p.score)}
                  r="4.4"
                  fill={color}
                  stroke="white"
                  strokeWidth="1.4"
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    onHoverSubject && onHoverSubject(s);
                    setPointHover({ subject: s, topic: p.topic, score: p.score, date: p.date, difficulty: p.difficulty, ...posFromEvent(e) });
                    setLineHover(null);
                  }}
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    setPointHover((cur) => (cur ? { ...cur, ...posFromEvent(e) } : cur));
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    setPointHover(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLineClick(s);
                  }}
                />
              ))}
            </g>
          );
        })}

        {/* Per-subject predicted end markers + end-of-line labels */}
        {subjects.map((s) => {
          const pts = series[s] || [];
          if (pts.length === 0) return null;
          const p = predictedBySubject?.[s];
          if (!p || p.count === 0) return null;
          const color = SUBJECT_COLORS[allSubjects.indexOf(s) % SUBJECT_COLORS.length];
          const lastX = xFor(pts.length - 1);
          const predX = w - padR + 6;
          const predY = yFor(p.predicted);
          const op = opacityFor(s);
          const gradeLabel = p.grade?.label ?? `${p.predicted}%`;
          return (
            <g
              key={`pred-${s}`}
              style={{ opacity: op, transition: 'opacity 160ms ease' }}
              onMouseEnter={(e) => {
                onHoverSubject && onHoverSubject(s);
                setLineHover({ subject: s, ...posFromEvent(e) });
              }}
              onMouseMove={(e) => setLineHover({ subject: s, ...posFromEvent(e) })}
              onMouseLeave={() => setLineHover(null)}
              onClick={() => handleLineClick(s)}
              className="cursor-pointer"
            >
              {/* dashed connector from the last real point to the predicted marker */}
              <line x1={lastX} y1={yFor(pts[pts.length - 1].score)} x2={predX} y2={predY} stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.85" />
              <circle cx={predX} cy={predY} r="4.6" fill="white" stroke={color} strokeWidth="2.2" />
              {/* End-of-line label: subject + grade */}
              <text x={predX + 8} y={predY - 2} fontSize="10" fontWeight="700" fill={color}>
                {gradeLabel}
              </text>
              <text x={predX + 8} y={predY + 10} fontSize="8.5" fill="#64748b">
                {s.length > 12 ? s.slice(0, 12) + '\u2026' : s}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Per-attempt point tooltip: topic + score + date */}
      {pointHover && (
        <div
          className="pointer-events-none absolute z-20 rounded-lg bg-slate-900 text-white text-[11px] px-3 py-2 shadow-xl min-w-[160px]"
          style={{ left: Math.max(4, pointHover.x + 12), top: Math.max(4, pointHover.y - 12), transform: 'translateY(-100%)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: SUBJECT_COLORS[allSubjects.indexOf(pointHover.subject) % SUBJECT_COLORS.length] }} />
            <span className="font-semibold">{pointHover.subject}</span>
          </div>
          <div className="mt-1 text-slate-200 text-[11.5px] leading-tight">{pointHover.topic}</div>
          <div className="mt-1 flex items-center gap-2 tabular-nums">
            <span className="font-semibold">{pointHover.score}%</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-300">{formatShortDate(pointHover.date)}</span>
          </div>
          {pointHover.difficulty && (
            <div className="mt-0.5 text-[10px] text-slate-400 uppercase tracking-wide">
              {String(pointHover.difficulty)}
            </div>
          )}
        </div>
      )}

      {/* Line-hover subject info card (predicted grade, latest, best, improvement, thresholds) */}
      {activeLineSubject && subjectDetails?.[activeLineSubject] && (
        <SubjectHoverCard
          subject={activeLineSubject}
          color={SUBJECT_COLORS[allSubjects.indexOf(activeLineSubject) % SUBJECT_COLORS.length]}
          details={subjectDetails[activeLineSubject]}
          examTrack={examTrack}
          x={activePos.x}
          y={activePos.y}
        />
      )}
    </div>
  );
}

function formatShortDate(d) {
  if (!d) return '';
  try {
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return String(d);
  }
}

function SubjectHoverCard({ subject, color, details, examTrack, x, y }) {
  const { bd, grade, best, latest, sw, count } = details;
  const tone = TONE_CLASSES[grade?.tone] || TONE_CLASSES.ok;
  // Position the card next to the cursor, but keep it inside the container.
  const style = {
    left: Math.max(4, x + 14),
    top: Math.max(4, y + 14),
  };
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-xl bg-white border border-[color:var(--color-border)] shadow-xl p-3 w-[240px] text-[11.5px]"
      style={style}
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-[13px] font-semibold text-slate-900 truncate">{subject}</span>
        <span className="ml-auto text-[10px] text-slate-500">{count} {count === 1 ? 'attempt' : 'attempts'}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-500">
          {grade?.sub || 'Predicted'}
        </div>
        <div className={`text-[16px] font-semibold ${tone?.text || 'text-slate-900'} tabular-nums`}>
          {grade?.label ?? `${bd.score}%`}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {latest && (
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-slate-400 font-semibold">Latest</div>
            <div className="tabular-nums font-medium text-slate-800">{latest.score}%</div>
            <div className="text-slate-400 truncate">{latest.topic}</div>
          </div>
        )}
        {best && (
          <div>
            <div className="text-[9.5px] uppercase tracking-wide text-slate-400 font-semibold">Best</div>
            <div className="tabular-nums font-medium text-slate-800">{best.score}%</div>
            <div className="text-slate-400 truncate">{best.topic}</div>
          </div>
        )}
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-slate-400 font-semibold">Base</div>
          <div className="tabular-nums font-medium text-slate-800">{bd.baseScore}%</div>
          {bd.hasImprovement ? (
            <div className="text-emerald-600 tabular-nums font-medium">+{bd.improvementBonus} bonus</div>
          ) : (
            <div className="text-slate-400">no bonus</div>
          )}
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-slate-400 font-semibold">Topics</div>
          <div className="text-slate-800">
            <span className="tabular-nums font-medium text-blue-700">{sw?.strengths?.length ?? 0}</span> strong
            <span className="text-slate-400 mx-1">·</span>
            <span className="tabular-nums font-medium text-rose-600">{sw?.weaknesses?.length ?? 0}</span> weak
          </div>
          {sw && (
            <div className="text-slate-400 tabular-nums">&ge; {sw.strengthMin}% / &lt; {sw.weaknessMax}%</div>
          )}
        </div>
      </div>
      <div className="mt-2 text-[10.5px] text-slate-400 italic">
        Click line to jump to full details &darr;
      </div>
    </div>
  );
}

function DeltaPill({ delta, small = false }) {
  const Up = delta > 0;
  const Down = delta < 0;
  const Icon = Up ? TrendingUp : (Down ? TrendingDown : Minus);
  const cls = Up
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : (Down ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200');
  const sign = Up ? '+' : (Down ? '' : '±');
  return (
    <span className={`inline-flex items-center gap-1 px-${small ? '1.5' : '2'} py-0.5 rounded-md text-[${small ? '10.5' : '11.5'}px] font-semibold border ${cls}`}>
      <Icon className={small ? 'w-4 h-4' : 'w-4 h-4'} />
      <span>{sign}{Math.abs(delta).toFixed(0)} pp</span>
    </span>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-4">
      <div className="eyebrow-muted">{label}</div>
      <div className="text-[20px] font-semibold mt-1 text-slate-900">{value}</div>
    </div>
  );
}
