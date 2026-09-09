import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarClock, Sparkles, BookOpen, ArrowRight, PlayCircle, Stethoscope } from 'lucide-react';
import { useStrengthsWeaknesses, useSavedSwOverrides } from '../../hooks/useStrengthsWeaknesses';
import { predictedScore, formatGrade, scoreToIBGrade } from '../../lib/predictedGrade';
import { SUBJECT_INFO } from '../../data/mock';
import { enrolledSubjects, subjectBoards, boardName } from '../../lib/subjects';
import PredictedScoreMini from './PredictedScoreMini';
import CreateWorksheetButton from './CreateWorksheetButton';
import { diagnosisSnippet } from './ai/DiagnosisPanel';

const SUBJECT_TONE_BADGE = {
  primary: 'bg-blue-100 text-blue-700',
  violet: 'bg-blue-100 text-blue-700',
  blue: 'bg-violet-100 text-violet-700',
  secondary: 'bg-violet-100 text-violet-700',
  cyan: 'bg-red-100 text-red-700',
  accent: 'bg-red-100 text-red-700',
  success: 'bg-emerald-100 text-emerald-700',
};

// Rotating dashboard greetings. `{name}` is substituted with the student's
// first name (falling back to "Student"). One is picked per component mount,
// so refreshing the page yields a new greeting.
const GREETING_TEMPLATES = [
  '{name} strikes again!',
  'Ready for another win, {name}?',
  'Welcome back, {name}.',
  "Let's crush it today, {name}.",
  'Back at it, {name}!',
  'Time to shine, {name}.',
  'Your worksheets missed you, {name}.',
  'One session closer, {name}.',
  '{name}, the grind continues.',
  'Nice to see you, {name}.',
  "Let's make today count, {name}.",
  'Onwards and upwards, {name}.',
  '{name} is in the building.',
  'Focus mode: engaged, {name}.',
  'Small wins add up, {name}.',
];

function pickGreeting(fullName) {
  const name = (fullName || 'Student').split(' ')[0] || 'Student';
  const tpl = GREETING_TEMPLATES[Math.floor(Math.random() * GREETING_TEMPLATES.length)];
  return tpl.replace('{name}', name);
}

function Ring({ value = 0 }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative w-[80px] h-[80px]">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="ring-track" />
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className="ring-fill" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-zinc-900">{Math.round(value)}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-4 bg-white">
      <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">{label}</div>
      <div className="text-[20px] font-semibold mt-1 text-slate-900">{value}</div>
    </div>
  );
}

// Latest AI diagnosis — the most recently diagnosed worksheet, linking into
// Smart Learning where the full text and history live.
function LatestDiagnosisStat({ sheet, go }) {
  const d = sheet?.diagnosis;
  return (
    <button
      type="button"
      onClick={() => go('recommendations')}
      className="text-left rounded-xl border border-emerald-200/70 p-4 bg-emerald-50/60 hover:border-emerald-400 transition-colors relative overflow-hidden"
      data-testid="latest-diagnosis"
      aria-label="Open Smart Learning"
    >
      <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-emerald-700 inline-flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Latest diagnosis</div>
      {d ? (
        <>
          <div className="text-[13.5px] font-semibold text-slate-900 mt-1 truncate">{sheet.subject} · {sheet.topic} <span className="text-slate-500 font-medium tabular-nums">{sheet.score}%</span></div>
          <div className="text-[12px] text-slate-600 mt-1 leading-snug line-clamp-2">{diagnosisSnippet(d.text)}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1.5">Read in Smart Learning &rarr;</div>
        </>
      ) : (
        <>
          <div className="text-[20px] font-semibold mt-1 text-slate-400">&mdash;</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Finish a worksheet to get one.</div>
        </>
      )}
    </button>
  );
}

function DaysStat({ days, subLabel }) {
  const has = days !== null && days !== undefined;
  return (
    <div className="rounded-xl border border-violet-200/70 p-4 bg-violet-50 relative overflow-hidden" data-testid="days-until-exam">
      <div className="relative text-[10px] tracking-[0.14em] uppercase font-semibold text-violet-700">Days until exam</div>
      <div className="relative text-[24px] font-semibold mt-1 text-slate-900 tabular-nums">
        {has ? days : '\u2014'}
        {has && <span className="text-[12px] font-medium text-slate-500 ml-1">{days === 1 ? 'day' : 'days'}</span>}
      </div>
      {subLabel && <div className="relative text-[11px] text-slate-500 mt-0.5 truncate">{subLabel}</div>}
      {!has && !subLabel && <div className="relative text-[11px] text-slate-500 mt-0.5">Add a course</div>}
    </div>
  );
}

export default function Dashboard({ go }) {
  const { state, clearDraftWorksheet } = useApp();
  const ws = state.worksheets || [];
  const draft = state.draftWorksheet;
  const resumeDraft = () => {
    try { window.sessionStorage.setItem('resume_ws_draft', '1'); } catch (_) { /* ignore */ }
    go('worksheets');
  };

  const stats = useMemo(() => {
    const total = ws.reduce((s, w) => s + (w.total || 0), 0);
    const correct = ws.reduce((s, w) => s + (w.correct || 0), 0);
    const sheets = ws.length;
    const readiness = total === 0 ? 0 : Math.round((correct / total) * 100);
    return { total, correct, sheets, readiness };
  }, [ws]);

  // Adaptive strengths/weaknesses shared with the Strengths page. Respects any
  // user-customized thresholds (persisted in localStorage).
  const swOverrides = useSavedSwOverrides();
  const {
    strengthMin,
    weaknessMax,
    isCustom: swIsCustom,
    strengths: swStrengths,
    weaknesses: swWeaknesses,
  } = useStrengthsWeaknesses(ws, swOverrides);

  const strongTopics = useMemo(() => swStrengths.slice(0, 3), [swStrengths]);
  const weakTopics = useMemo(() => swWeaknesses.slice(0, 3), [swWeaknesses]);

  // ---------------------------------------------------------------------------
  // Per-subject predicted grade + optional IB total.
  // ---------------------------------------------------------------------------
  const examTrack = state.user?.examTrack || 'CBSE';
  // Each subject's board comes from the course it belongs to (falling back to
  // the student's exam track). Predicted grades are then computed and shown
  // per board, never mixed across boards.
  const subjBoards = useMemo(() => subjectBoards(state.courses, examTrack), [state.courses, examTrack]);
  const boardOf = (s) => subjBoards[s]?.board || examTrack;
  const perSubjectGrades = useMemo(() => {
    const subjects = Array.from(new Set(ws.map((w) => w.subject))).sort();
    return subjects.map((s) => {
      const list = ws.filter((w) => w.subject === s);
      const score = predictedScore(list);
      const board = subjBoards[s]?.board || examTrack;
      return {
        subject: s,
        score,
        board,
        count: list.length,
        grade: formatGrade(score, board),
        ibGrade: scoreToIBGrade(score), // handy for the IB total
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, subjBoards, examTrack]);

  // Shape the same map the Performance tab's PredictedScoreMini expects,
  // so the tile renders identically in both places.
  const predictedBySubject = useMemo(() => {
    const map = {};
    perSubjectGrades.forEach((g) => {
      map[g.subject] = { predicted: g.score, count: g.count, grade: g.grade };
    });
    return map;
  }, [perSubjectGrades]);
  const visibleSubjects = useMemo(() => perSubjectGrades.map((g) => g.subject), [perSubjectGrades]);

  // Accuracy — a plus/minus margin of uncertainty on the predicted grade.
  // The predicted grade is essentially the mean of your worksheet scores, so
  // the standard error of that mean (σ / √n) is exactly the uncertainty on
  // the prediction: how far the true / final grade can plausibly sit from
  // what we're predicting today. Small scatter or lots of worksheets → tight
  // band. Big scatter or only a few sheets → wide band.
  // Requires at least 2 worksheets (need scatter). Clamped to 1..20 pp so the
  // number always feels sensible and never disappears into 0 or blows up.
  const overallAccuracy = useMemo(() => {
    if (ws.length < 2) return null;
    const scores = ws.map((w) => Number(w.score) || 0);
    const n = scores.length;
    const mean = scores.reduce((s, v) => s + v, 0) / n;
    // Sample standard deviation (Bessel's correction: divide by n-1).
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
    const sigma = Math.sqrt(variance);
    const stdError = sigma / Math.sqrt(n);
    // Use ~1 × SE for a snug "typical" band — feels honest at study-app
    // sample sizes without ballooning to ±20 with only 3 worksheets.
    const margin = Math.round(stdError);
    return Math.max(1, Math.min(20, margin));
  }, [ws]);

  // Chronological worksheet series per subject — mirrors what the Progress
  // page's LineChart consumes, so the dashboard preview matches the full view.
  const chartData = useMemo(() => {
    const chronological = [...ws].slice().reverse(); // oldest first
    const subjects = Array.from(new Set(chronological.map((w) => w.subject))).sort();
    const series = {};
    subjects.forEach((s) => { series[s] = []; });
    chronological.forEach((w, i) => {
      if (!series[w.subject]) return;
      series[w.subject].push({ x: i, score: w.score });
    });
    return { subjects, series, total: chronological.length };
  }, [ws]);

  // IB total: sum of per-subject IB grades (out of subjectCount × 7).
  // Only shown when the student is on the IB track — CBSE/ICSE stay per-subject.
  // IB diploma-style total (sum of 1-7 grades) — computed from IB-board
  // subjects only, so it appears for a mixed CBSE+IB student too.
  const ibTotal = useMemo(() => {
    const ibSubs = perSubjectGrades.filter((g) => (g.board || '').toUpperCase() === 'IB');
    if (ibSubs.length === 0) return null;
    const sum = ibSubs.reduce((acc, g) => acc + g.ibGrade, 0);
    const max = ibSubs.length * 7;
    return { sum, max, subjects: ibSubs.length };
  }, [perSubjectGrades]);

  const latestDiagnosed = useMemo(() => {
    const withDiag = ws.filter((w) => w.diagnosis && w.diagnosis.text);
    if (withDiag.length === 0) return null;
    return [...withDiag].sort((a, b) => new Date(b.diagnosis.createdAt || b.date || 0) - new Date(a.diagnosis.createdAt || a.date || 0))[0];
  }, [ws]);

  const goalDate = new Date().toDateString();
  const questionsToday = state.goalDate === goalDate ? state.questionsToday : 0;
  const dailyGoal = state.settings?.dailyGoal || 10;
  const progressPct = Math.min(100, Math.round((questionsToday / dailyGoal) * 100));

  // Flatten all subjects from all courses with their per-subject exam dates
  const courseExams = useMemo(() => {
    const flat = [];
    (state.courses || []).forEach((c) => {
      const subs = Array.isArray(c.subjects) ? c.subjects : [{ subject: c.subject, examDate: c.examDate }];
      subs.forEach((s) => {
        if (!s.examDate) return;
        flat.push({
          name: s.subject,
          courseName: c.name,
          subject: s.subject,
          date: s.examDate,
          days: Math.max(0, Math.ceil((new Date(s.examDate + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        });
      });
    });
    flat.sort((a, b) => a.days - b.days);
    return flat;
  }, [state.courses]);

  const fallbackDate = state.settings?.examDate;
  const fallbackDays = fallbackDate ? Math.max(0, Math.ceil((new Date(fallbackDate + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  const nearest = courseExams[0];
  const examCountdown = nearest ? nearest.days : fallbackDays;
  const examLabel = nearest ? nearest.name : (fallbackDate ? new Date(fallbackDate).toLocaleDateString() : null);

  // Random greeting — picked once per mount, so it changes every refresh.
  const [greeting] = useState(() => pickGreeting(state.user?.name));

  // The student's subjects, matching what Start Studying shows. Each card
  // deep-links into that subject's overview (#study?subject=...).
  const studyTrack = state.user?.examTrack || 'SSLC';
  const mySubjects = useMemo(
    () => enrolledSubjects(state.courses, state.user?.subjects, studyTrack),
    [state.courses, state.user, studyTrack],
  );
  const mySubjectBoards = useMemo(
    () => subjectBoards(state.courses, studyTrack),
    [state.courses, studyTrack],
  );
  const openSubject = (s) => { window.location.hash = `#study?subject=${encodeURIComponent(s)}`; };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight text-slate-900">{greeting}</h2>
        <p className="text-[14px] text-slate-500 mt-1">Here is your study overview.</p>
      </div>

      {draft && (draft.questions || []).length > 0 && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex flex-wrap items-center justify-between gap-4"
          data-testid="dashboard-continue-worksheet"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <PlayCircle className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-amber-700">Unfinished worksheet</div>
              <div className="text-[15px] font-semibold text-slate-900 truncate">
                Continue {draft.subject}{draft.topics && draft.topics.length ? ` · ${draft.topics.join(', ')}` : ''}
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {draft.answered || 0} of {draft.total || (draft.questions || []).length} answered
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => clearDraftWorksheet()}
              data-testid="dashboard-discard-worksheet"
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={resumeDraft}
              data-testid="dashboard-resume-worksheet"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-amber-600 hover:opacity-95 transition-opacity"
            >
              <PlayCircle className="w-5 h-5" /> Continue
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DaysStat days={examCountdown} subLabel={examLabel} />
        <PredictedScoreMini
          predictedBySubject={predictedBySubject}
          visibleSubjects={visibleSubjects}
          examTrack={examTrack}
          subjectBoards={subjBoards}
          label="Predicted grade"
          footer={
            overallAccuracy !== null && (
              <div className="mt-2 pt-2 border-t border-[color:var(--color-border)] flex items-baseline justify-between gap-2">
                <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500" title="How far the final grade could plausibly differ from the predicted grade">Accuracy</span>
                <span className="text-[15px] font-semibold text-slate-900 tabular-nums">
                  &plusmn;{overallAccuracy}%
                </span>
              </div>
            )
          }
        />
        <LatestDiagnosisStat sheet={latestDiagnosed} go={go} />
        <Stat label="Worksheets completed" value={stats.sheets} />
      </div>

      {mySubjects.length > 0 && (
        <div data-testid="dashboard-my-subjects">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="eyebrow-muted flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" /> My subjects
            </div>
            <button
              onClick={() => go('study')}
              className="text-[12.5px] text-blue-700 hover:text-blue-900 font-medium transition-colors"
            >
              Browse all &rarr;
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {mySubjects.map((s) => {
              const info = SUBJECT_INFO[s] || { emoji: '\u25A0', tone: 'primary' };
              const b = mySubjectBoards[s];
              return (
                <button
                  key={s}
                  onClick={() => openSubject(s)}
                  data-testid={`dashboard-subject-${s}`}
                  className="group text-left rounded-xl border border-[color:var(--color-border)] bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[18px] font-semibold ${SUBJECT_TONE_BADGE[info.tone] || SUBJECT_TONE_BADGE.primary}`}>
                      {info.emoji}
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="mt-3 text-[14px] font-semibold text-slate-900 truncate">{s}</div>
                  {b && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10.5px] tracking-[0.1em] uppercase font-semibold text-blue-700">
                        {boardName(b.board)}
                      </span>
                      {b.ibLevel && (
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {b.ibLevel}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white">
          <div className="eyebrow-muted mb-2">Today&rsquo;s goal</div>
          <div className="text-[18px] font-semibold">{questionsToday} / {dailyGoal} questions</div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--color-border)] p-5 bg-white">
          <div className="eyebrow-muted mb-3 flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-violet-600" /> Upcoming exams</div>
          {courseExams.length === 0 ? (
            <button onClick={() => go('courses')} className="text-[14px] text-blue-700 hover:text-blue-900 transition-colors">Add a course to set per-subject exam dates &rarr;</button>
          ) : (
            <div className="flex flex-col gap-2">
              {courseExams.slice(0, 4).map((c) => (
                <div key={c.name + c.date} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-[color:var(--color-border)]">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-slate-900 truncate">{c.name}</div>
                    <div className="text-[11.5px] text-slate-500">{new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-semibold tabular-nums text-slate-900">{c.days}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">days</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {perSubjectGrades.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => go('progress')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('progress'); } }}
          className="group rounded-xl border border-[color:var(--color-border)] bg-white p-5 text-left cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
          data-testid="dashboard-performance-preview"
          aria-label="Open performance page"
        >
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <div className="eyebrow-muted flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Performance
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                Your worksheet scores over time. Click to open the full performance page.
              </div>
            </div>
            {ibTotal && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-right shrink-0" data-testid="ib-total">
                <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-emerald-700">IB total</div>
                <div className="text-[18px] font-semibold text-emerald-800 tabular-nums leading-tight">
                  {ibTotal.sum}<span className="text-slate-500 font-normal">/{ibTotal.max}</span>
                </div>
                <div className="text-[10.5px] text-slate-500">{ibTotal.subjects} {ibTotal.subjects === 1 ? 'subject' : 'subjects'}</div>
              </div>
            )}
          </div>
          <PerformanceLineChart subjects={chartData.subjects} series={chartData.series} totalX={chartData.total} />
          <div className="mt-2 text-right text-[12px] text-blue-600 font-medium opacity-70 group-hover:opacity-100 transition-opacity">
            Open performance &rarr;
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow-muted">Strong topics</div>
            <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              {swIsCustom
                ? <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">Custom</span>
                : <><Sparkles className="w-4 h-4 text-slate-400" />Adaptive</>}
              <span className="tabular-nums">≥ {strengthMin}%</span>
            </div>
          </div>
          {strongTopics.length === 0 ? (
            <div className="text-[14px] text-zinc-500">Complete a worksheet to start measuring strengths.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {strongTopics.map((t) => (
                <span key={t.topic} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[12.5px] font-medium">{t.topic} · {t.acc}%</span>
              ))}
              {swStrengths.length > 3 && (
                <button onClick={() => go('strengths')} className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[12.5px] font-medium hover:bg-slate-100 transition">
                  +{swStrengths.length - 3} more
                </button>
              )}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow-muted">Weak topics</div>
            <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              {swIsCustom
                ? <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">Custom</span>
                : <><Sparkles className="w-4 h-4 text-slate-400" />Adaptive</>}
              <span className="tabular-nums">&lt; {weaknessMax}%</span>
            </div>
          </div>
          {weakTopics.length === 0 ? (
            <div className="text-[14px] text-zinc-500">Missed questions will appear here.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t) => (
                <span key={t.topic} className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-[12.5px] font-medium">{t.topic} · {t.acc}%</span>
              ))}
              {swWeaknesses.length > 3 && (
                <button onClick={() => go('strengths')} className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-[12.5px] font-medium hover:bg-slate-100 transition">
                  +{swWeaknesses.length - 3} more
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CreateWorksheetButton onClick={() => go('worksheets')} className="px-5 py-2.5" />
        <button onClick={() => go('study')} className="btn-outline-dark px-5 py-2.5 rounded-lg text-[14px] font-medium">Browse subjects</button>
      </div>
    </div>
  );
}


function PerformanceLineChart({ subjects, series, totalX }) {
  const w = 800;
  const h = 240;
  const padL = 48;
  const padR = 14;
  const padT = 12;
  const padB = 34;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const nX = Math.max(1, (totalX || 1) - 1);
  const stepX = chartW / nX;
  const xAt = (i) => padL + i * stepX;
  const yAt = (score) => padT + chartH - (Math.max(0, Math.min(100, score)) / 100) * chartH;

  const gridLines = [0, 25, 50, 75, 100];
  const palette = ['#2563eb', '#7c3aed', '#dc2626', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#14b8a6'];

  if (!subjects || subjects.length === 0 || totalX < 1) {
    return (
      <div className="h-40 flex items-center justify-center text-[13px] text-slate-500 border border-dashed border-slate-200 rounded-lg">
        Complete a worksheet to start drawing your improvement line.
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Worksheet scores over time, per subject">
        {/* horizontal grid + y labels */}
        {gridLines.map((g) => (
          <g key={g}>
            <line x1={padL} x2={w - padR} y1={yAt(g)} y2={yAt(g)} stroke="#e2e8f0" strokeDasharray="4 5" />
            <text x={padL - 8} y={yAt(g) + 4} fontSize="11" fill="#94a3b8" textAnchor="end">{g}%</text>
          </g>
        ))}
        {/* subject lines */}
        {subjects.map((s, si) => {
          const points = series[s] || [];
          if (points.length === 0) return null;
          const color = palette[si % palette.length];
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.x)} ${yAt(p.score)}`).join(' ');
          return (
            <g key={s}>
              <path d={d} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={xAt(p.x)} cy={yAt(p.score)} r={3.2} fill={color} stroke="#fff" strokeWidth="1.6" />
              ))}
            </g>
          );
        })}
        {/* x-axis label */}
        <text x={padL} y={h - 10} fontSize="10.5" fill="#94a3b8">Oldest</text>
        <text x={w - padR} y={h - 10} fontSize="10.5" fill="#94a3b8" textAnchor="end">Latest worksheet</text>
      </svg>
      {/* legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {subjects.map((s, si) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: palette[si % palette.length] }} />
            <span className="truncate max-w-[140px]">{s}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
