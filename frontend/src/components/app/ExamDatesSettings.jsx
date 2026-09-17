import React from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';

const today = () => new Date().toISOString().slice(0, 10);
const daysFrom = (iso) => (iso ? Math.max(0, Math.ceil((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86400000)) : null);

// Settings → Exam dates: one calendar per course subject (these drive the
// dashboard countdown), plus the account-wide fallback date.
export default function ExamDatesSettings() {
  const { state, updateCourse, updateSettings } = useApp();
  const courses = state.courses || [];
  const setSubjectDate = (course, subjectName, iso) => {
    const subjects = (Array.isArray(course.subjects) ? course.subjects : []).map((e) => {
      const entry = typeof e === 'string' ? { subject: e } : e;
      return entry.subject === subjectName ? { ...entry, examDate: iso || undefined } : entry;
    });
    updateCourse(course.id, { subjects });
    toast.success(iso ? `${subjectName}: ${new Date(iso + 'T00:00:00').toLocaleDateString()}` : `${subjectName}: date cleared`);
  };
  const rows = courses.flatMap((c) => (Array.isArray(c.subjects) ? c.subjects : []).map((e) => {
    const entry = typeof e === 'string' ? { subject: e } : e;
    return { course: c, name: entry.subject, date: entry.examDate || '' };
  }));

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="exam-dates">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold text-slate-900">Exam dates</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Pick a date on the calendar for each subject. The dashboard counts down to the nearest one.</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">Add a course to set dates per subject.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)]">
          {rows.map((r) => {
            const d = daysFrom(r.date);
            return (
              <li key={`${r.course.id}-${r.name}`} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 truncate">{r.name}</div>
                  <div className="text-[12px] text-slate-500 truncate">{r.course.name} · {r.course.exam}</div>
                </div>
                <input type="date" min={today()} value={r.date} onChange={(e) => setSubjectDate(r.course, r.name, e.target.value)} aria-label={`Exam date for ${r.name}`} className="input-base !w-auto" data-testid={`exam-date-${r.name.replace(/\s+/g, '-')}`} />
                <div className="text-[12px] text-slate-500 tabular-nums sm:text-right min-w-[72px]">{d !== null ? `${d} ${d === 1 ? 'day' : 'days'}` : 'No date'}</div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 pt-4 border-t border-[color:var(--color-border)] grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
        <div>
          <div className="text-[14px] font-medium text-slate-900">Fallback date</div>
          <div className="text-[12px] text-slate-500">Used when a subject has no date of its own.</div>
        </div>
        <input type="date" min={today()} value={state.settings?.examDate || ''} onChange={(e) => { updateSettings({ examDate: e.target.value }); toast.success(e.target.value ? 'Fallback exam date saved' : 'Fallback date cleared'); }} aria-label="Fallback exam date" className="input-base !w-auto" data-testid="exam-date-fallback" />
      </div>
    </section>
  );
}
