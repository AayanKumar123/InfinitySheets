import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EXAM_TRACKS, SUBJECTS, SUBJECT_INFO } from '../../data/mock';
import { ArrowRight, ArrowLeft, Calendar, CheckCircle2, GraduationCap, BookOpen, X, Sparkles, CalendarClock, Target } from 'lucide-react';
import StudyDecor from '../decor/StudyDecor';
import { toast } from 'sonner';

const STEP_LABELS = ['Exam', 'Subjects', 'Dates', 'Schedule'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Every day', hint: '7 sessions / week' },
  { id: '3-4 per week', label: '3–4 times a week', hint: 'Balanced pace' },
  { id: '1-2 per week', label: '1–2 times a week', hint: 'Casual review' },
  { id: 'exam only', label: 'Only near exams', hint: 'Cram before test' },
];
const WEEKLY_GOALS = [25, 50, 75, 100, 150];

function inDays(d) {
  const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10);
}

export default function CourseWizard({ mode = 'onboarding', onClose }) {
  const { state, addCourse, completeOnboarding } = useApp();
  const isOnboarding = mode === 'onboarding';

  const [step, setStep] = useState(0);
  const [examTrack, setExamTrack] = useState(state.user?.examTrack || 'SSLC');
  const trackSubjects = useMemo(() => SUBJECTS[examTrack] || [], [examTrack]);
  const [picked, setPicked] = useState([]); // [subject, ...]
  const [dates, setDates] = useState({});   // { subject: 'YYYY-MM-DD' }
  const [target, setTarget] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [courseName, setCourseName] = useState('');
  const [frequency, setFrequency] = useState(state.settings?.frequency || '3-4 per week');
  const [weeklyGoal, setWeeklyGoal] = useState(state.settings?.weeklyGoal || 50);

  const togglePick = (s) => setPicked((arr) => arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]);

  const validate = () => {
    if (step === 0 && !examTrack) return 'Pick an exam track';
    if (step === 1 && picked.length === 0) return 'Pick at least one subject';
    if (step === 2) {
      const missing = picked.filter((s) => !dates[s]);
      if (missing.length) return `Set a date for ${missing.join(', ')}`;
    }
    if (step === 3) {
      if (!frequency) return 'Pick how often you want to practice';
      if (!weeklyGoal || weeklyGoal < 1) return 'Set a weekly goal';
    }
    return null;
  };

  const next = () => {
    const err = validate(); if (err) { toast.error(err); return; }
    if (step < 3) { setStep((v) => v + 1); return; }
    finish();
  };
  const back = () => setStep((v) => Math.max(0, v - 1));

  const finish = () => {
    const exam = EXAM_TRACKS.find((e) => e.id === examTrack);
    const subjects = picked.map((s) => ({ subject: s, examDate: dates[s], target, level }));
    const name = (courseName || '').trim() || `${exam?.name || examTrack} ${picked.length > 1 ? 'Term' : picked[0]}`;
    const courseId = `c_${Date.now()}`;
    addCourse({ id: courseId, name, exam: examTrack, subjects, status: 'Active', target, level });
    const earliest = subjects.map((x) => x.examDate).sort()[0];
    if (isOnboarding) {
      completeOnboarding({ examTrack, examDate: earliest, subjects: picked, frequency, weeklyGoal });
      toast.success(`Setup complete — here's your course overview`);
      // The tutorial's first step will navigate to #course-overview automatically.
    } else {
      toast.success(`${name} added`);
      window.location.hash = `#course-overview?id=${encodeURIComponent(courseId)}`;
    }
    if (onClose) onClose();
  };

  const skip = () => {
    if (onClose) onClose();
    else if (isOnboarding) completeOnboarding({ examTrack, examDate: '', subjects: trackSubjects, frequency, weeklyGoal });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center section-bg overflow-auto">
      <StudyDecor density="dense" />
      <div className="absolute inset-0 grid-fade pointer-events-none" />

      <div className="relative w-full max-w-[860px] mx-4 my-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-slate-900">{isOnboarding ? 'Quick setup' : 'Add a course'}</div>
              <div className="text-[11.5px] text-slate-500">{isOnboarding ? `Hi ${state.user?.name || 'there'} · build your first course` : 'A course can contain multiple subjects'}</div>
            </div>
          </div>
          <button onClick={skip} className="text-[12.5px] text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1">
            {onClose ? 'Cancel' : 'Skip'} <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-[12.5px] font-medium ${i === step ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[color:var(--color-border)] overflow-hidden">
          <div className="h-1 w-full bg-slate-100">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>

          {step === 0 && (
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span className="text-[11px] tracking-[0.16em] uppercase font-semibold text-blue-600">Step 1</span>
              </div>
              <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Which exam is this course for?</h2>
              <p className="text-[13.5px] text-slate-500 mt-1">A course groups subjects under one exam track.</p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {EXAM_TRACKS.map((t) => {
                  const sel = examTrack === t.id;
                  return (
                    <button key={t.id} onClick={() => { setExamTrack(t.id); setPicked([]); setDates({}); }}
                      className={`text-left rounded-xl border px-4 py-3 transition-colors ${sel ? 'border-blue-400 bg-blue-50' : 'border-[color:var(--color-border)] bg-white hover:bg-slate-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`text-[13.5px] font-semibold ${sel ? 'text-blue-700' : 'text-slate-900'}`}>{t.name}</div>
                        </div>
                        {sel && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-red-600" />
                <span className="text-[11px] tracking-[0.16em] uppercase font-semibold text-red-700">Step 2</span>
              </div>
              <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Pick the subjects in this course</h2>
              <p className="text-[13.5px] text-slate-500 mt-1">Select one or more subjects. Each can have its own exam date in the next step.</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[12.5px] text-slate-500">{picked.length} selected</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPicked(trackSubjects)} className="text-[12.5px] text-blue-700 hover:text-blue-900 transition-colors">Select all</button>
                  <span className="text-slate-300">/</span>
                  <button onClick={() => { setPicked([]); setDates({}); }} className="text-[12.5px] text-slate-500 hover:text-slate-800 transition-colors">Clear</button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {trackSubjects.map((s) => {
                  const info = SUBJECT_INFO[s] || { emoji: '\u25A0', tagline: 'Practice and improve.' };
                  const sel = picked.includes(s);
                  return (
                    <button key={s} onClick={() => togglePick(s)}
                      className={`text-left rounded-xl border px-4 py-3 transition-colors ${sel ? 'border-blue-400 bg-blue-50' : 'border-[color:var(--color-border)] bg-white hover:bg-slate-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[16px] leading-none">{info.emoji}</span>
                            <span className={`text-[13.5px] font-semibold ${sel ? 'text-blue-700' : 'text-slate-900'}`}>{s}</span>
                          </div>
                        </div>
                        {sel && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-violet-600" />
                <span className="text-[11px] tracking-[0.16em] uppercase font-semibold text-violet-700">Step 3</span>
              </div>
              <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">Set an exam date per subject</h2>
              <p className="text-[13.5px] text-slate-500 mt-1">Each subject can have its own date, so countdowns stay accurate.</p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Course name (optional)</span>
                  <input className="input-base" placeholder="e.g., IB Year 2" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Default target / level</span>
                  <div className="flex items-center gap-2">
                    <input className="input-base" placeholder="Target (e.g., 7)" value={target} onChange={(e) => setTarget(e.target.value)} />
                    <select className="input-base" value={level} onChange={(e) => setLevel(e.target.value)} style={{ maxWidth: 160 }}>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {picked.map((s) => {
                  const info = SUBJECT_INFO[s] || { emoji: '\u25A0' };
                  const v = dates[s] || '';
                  const days = v ? Math.max(0, Math.ceil((new Date(v + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
                  return (
                    <div key={s} className="rounded-xl border border-[color:var(--color-border)] p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] leading-none">{info.emoji}</span>
                        <div>
                          <div className="text-[14px] font-semibold text-slate-900">{s}</div>
                        </div>
                      </div>
                      <input type="date" min={new Date().toISOString().slice(0, 10)} className="input-base" value={v} onChange={(e) => setDates((d) => ({ ...d, [s]: e.target.value }))} />
                      <div className="rounded-md border border-violet-200/60 bg-violet-50 px-3 py-2 text-right min-w-[100px]">
                        <div className="text-[9.5px] tracking-wider uppercase font-semibold text-violet-700">Days</div>
                        <div className="text-[16px] font-semibold text-slate-900 tabular-nums">{days !== null ? days : '—'}</div>
                      </div>
                      <div className="md:col-span-3 flex flex-wrap gap-1.5">
                        {[7, 30, 60, 90, 180].map((d) => {
                          const iso = inDays(d);
                          return (
                            <button key={d} onClick={() => setDates((m) => ({ ...m, [s]: iso }))}
                              className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors ${v === iso ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-[color:var(--color-border)] bg-white text-slate-700 hover:bg-slate-100'}`}>
                              In {d} days
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                <span className="text-[11px] tracking-[0.16em] uppercase font-semibold text-blue-600">Step 4</span>
              </div>
              <h2 className="text-[26px] font-semibold tracking-tight text-slate-900">How often will you practice?</h2>
              <p className="text-[13.5px] text-slate-500 mt-1">We&apos;ll pace your reminders and progress goals around this cadence. You can change it anytime in Settings.</p>

              <div className="mt-5">
                <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2">Worksheet frequency</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FREQUENCY_OPTIONS.map((f) => {
                    const sel = frequency === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFrequency(f.id)}
                        data-testid={`freq-${f.id}`}
                        className={`text-left rounded-xl border px-4 py-3 transition-colors ${sel ? 'border-blue-400 bg-blue-50' : 'border-[color:var(--color-border)] bg-white hover:bg-slate-100'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`text-[13.5px] font-semibold ${sel ? 'text-blue-700' : 'text-slate-900'}`}>{f.label}</div>
                            <div className="text-[11.5px] text-slate-500 mt-0.5">{f.hint}</div>
                          </div>
                          {sel && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-violet-600" />
                  <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Weekly question goal</div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {WEEKLY_GOALS.map((g) => {
                    const sel = weeklyGoal === g;
                    return (
                      <button
                        key={g}
                        onClick={() => setWeeklyGoal(g)}
                        data-testid={`weekly-${g}`}
                        className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors ${sel ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-[color:var(--color-border)] bg-white text-slate-700 hover:bg-slate-100'}`}
                      >
                        {g} questions
                      </button>
                    );
                  })}
                  <label className="inline-flex items-center gap-2 border border-[color:var(--color-border)] rounded-lg px-3 py-1.5 bg-white">
                    <span className="text-[12px] text-slate-500">Custom</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={weeklyGoal}
                      onChange={(e) => setWeeklyGoal(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      data-testid="weekly-custom"
                      className="w-16 bg-transparent outline-none text-[13px] font-semibold text-slate-900 tabular-nums text-right"
                    />
                  </label>
                </div>
                <div className="text-[11.5px] text-slate-500 mt-2">
                  That&apos;s about <span className="font-semibold text-slate-700">{Math.max(1, Math.round(weeklyGoal / 7))} questions a day</span>.
                </div>
              </div>
            </div>
          )}

          <div className="px-6 py-4 border-t border-[color:var(--color-border)] flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="text-[12px] text-slate-500">{step + 1} of 4</div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button onClick={back} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-[13px] font-medium border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700 transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
              )}
              <button onClick={next} data-testid="wizard-next" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-blue-600 hover:opacity-95 transition-opacity">
                {step === 3 ? (<><Sparkles className="w-5 h-5" /> {isOnboarding ? 'Finish setup' : 'Add course'}</>) : (<>Continue <ArrowRight className="w-5 h-5" /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
