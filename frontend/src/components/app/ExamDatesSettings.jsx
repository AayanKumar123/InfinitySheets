import React, { useState } from 'react';
import { Plus, X, ChevronDown, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

const today = () => new Date().toISOString().slice(0, 10);
const daysFrom = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000)) : null);
const nearest = (exams) => exams.map((e) => e.date).filter(Boolean).sort()[0] || undefined;

// A subject can have several dated exams (Paper 1, Paper 2, a mock…). The
// nearest one is mirrored into `examDate`, which the countdown and the
// "Upcoming exams" list read.
function examsOf(entry) {
  if (Array.isArray(entry.exams) && entry.exams.length) return entry.exams;
  return entry.examDate ? [{ name: 'Exam', date: entry.examDate }] : [];
}

// Settings → Exam dates: calendars per exam, per course subject, plus the
// account-wide fallback date.
export default function ExamDatesSettings() {
  const { state, updateCourse, updateSettings } = useApp();
  const courses = state.courses || [];
  const [adding, setAdding] = useState(null); // `${courseId}|${subject}` being added to
  const [draft, setDraft] = useState({ name: '', date: '' });
  const [open, setOpen] = useState(false);

  const saveExams = (course, subjectName, exams) => {
    const subjects = (Array.isArray(course.subjects) ? course.subjects : []).map((e) => {
      const entry = typeof e === 'string' ? { subject: e } : e;
      return entry.subject === subjectName ? { ...entry, exams, examDate: nearest(exams) } : entry;
    });
    updateCourse(course.id, { subjects });
  };
  const rows = courses.flatMap((c) => (Array.isArray(c.subjects) ? c.subjects : []).map((e) => {
    const entry = typeof e === 'string' ? { subject: e } : e;
    return { course: c, name: entry.subject, exams: examsOf(entry) };
  }));

  const addExam = (r) => {
    if (!draft.date) { toast.error('Pick a date'); return; }
    const exams = [...r.exams, { name: draft.name.trim() || `Exam ${r.exams.length + 1}`, date: draft.date }];
    saveExams(r.course, r.name, exams);
    setAdding(null); setDraft({ name: '', date: '' });
    toast.success(`${r.name}: ${exams[exams.length - 1].name} added`);
  };

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="exam-dates">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left" aria-expanded={open} data-testid="exam-dates-toggle">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-100 text-blue-700"><CalendarClock className="w-4.5 h-4.5" /></span>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-slate-900">Exam dates</div>
            <div className="text-[12.5px] text-slate-500 mt-0.5">Each subject can have several exams (Paper 1, Paper 2, a mock). The dashboard counts down to the nearest one.</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
      <div className="mt-4">
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">Add a course to set dates per subject.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)]">
          {rows.map((r) => {
            const key = `${r.course.id}|${r.name}`;
            return (
              <li key={key} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-slate-900 truncate">{r.name}</div>
                    <div className="text-[12px] text-slate-500 truncate">{r.course.name} · {r.course.exam}</div>
                  </div>
                  <button type="button" onClick={() => { setAdding(adding === key ? null : key); setDraft({ name: '', date: '' }); }} className="btn-outline-dark inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12.5px] font-medium shrink-0" data-testid={`add-exam-${r.name.replace(/\s+/g, '-')}`}>
                    <Plus className="w-3.5 h-3.5" /> Add exam
                  </button>
                </div>
                {r.exams.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {r.exams.map((ex, i) => {
                      const d = daysFrom(ex.date);
                      return (
                        <li key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center rounded-lg border border-[color:var(--color-border)] px-3 py-2">
                          <input className="input-base py-1 text-[13px]" value={ex.name} aria-label="Exam name" onChange={(e) => saveExams(r.course, r.name, r.exams.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                          <input type="date" min={today()} value={ex.date} aria-label={`Date for ${ex.name}`} className="input-base !w-auto py-1 text-[13px]" data-testid={`exam-date-${r.name.replace(/\s+/g, '-')}-${i}`} onChange={(e) => saveExams(r.course, r.name, r.exams.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)))} />
                          <div className="text-[12px] text-slate-500 tabular-nums sm:text-right min-w-[64px]">{d !== null ? `${d} ${d === 1 ? 'day' : 'days'}` : 'No date'}</div>
                          <button type="button" aria-label={`Remove ${ex.name}`} onClick={() => { saveExams(r.course, r.name, r.exams.filter((_, k) => k !== i)); toast.success(`${ex.name} removed`); }} className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {adding === key && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center rounded-lg border border-dashed border-[color:var(--color-border)] px-3 py-2" data-testid="add-exam-form">
                    <input className="input-base py-1 text-[13px]" placeholder={`Name (e.g. Paper ${r.exams.length + 1})`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} autoFocus />
                    <input type="date" min={today()} value={draft.date} aria-label="New exam date" className="input-base !w-auto py-1 text-[13px]" data-testid="add-exam-date" onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
                    <button type="button" onClick={() => addExam(r)} className="btn-violet px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" data-testid="add-exam-save">Add</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 pt-4 border-t border-[color:var(--color-border)] grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div>
          <div className="text-[14px] font-medium text-slate-900">Fallback date</div>
          <div className="text-[12px] text-slate-500">Used when a subject has no exams of its own.</div>
        </div>
        <input type="date" min={today()} value={state.settings?.examDate || ''} onChange={(e) => { updateSettings({ examDate: e.target.value }); toast.success(e.target.value ? 'Fallback exam date saved' : 'Fallback date cleared'); }} aria-label="Fallback exam date" className="input-base !w-auto" data-testid="exam-date-fallback" />
      </div>
      </div>
      )}
    </section>
  );
}
