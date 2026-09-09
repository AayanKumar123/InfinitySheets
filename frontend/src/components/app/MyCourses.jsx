import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, GraduationCap, Trash2, CalendarClock, ArrowRight, Sparkles } from 'lucide-react';
import { EXAM_TRACKS, SUBJECT_INFO } from '../../data/mock';
import { toast } from 'sonner';
import CourseWizard from './CourseWizard';
import CustomCourseWizard from './CustomCourseWizard';
import EmptyStateScene from '../decor/EmptyStateScene';

const STATUS = ['Active', 'On hold', 'Completed'];

function daysUntil(d) {
  if (!d) return null;
  return Math.max(0, Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function statusClass(s) {
  if (s === 'Active') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  if (s === 'Completed') return 'bg-blue-50 border-blue-200 text-blue-700';
  return 'bg-slate-50 border-slate-200 text-slate-700';
}

// Normalize legacy single-subject courses into the new multi-subject shape
function normalize(course) {
  if (Array.isArray(course.subjects)) return course;
  return { ...course, subjects: [{ subject: course.subject, examDate: course.examDate, target: course.target, level: course.level }] };
}

function SubjectRow({ s }) {
  const info = SUBJECT_INFO[s.subject] || { emoji: '\u25A0' };
  const days = daysUntil(s.examDate);
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-[color:var(--color-border)]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[15px] leading-none">{info.emoji}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900 truncate">{s.subject}</div>
          <div className="text-[11px] text-slate-500">{s.examDate ? new Date(s.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[14px] font-semibold tabular-nums text-slate-900">{days !== null ? days : '—'}</div>
        <div className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-500">days</div>
      </div>
    </div>
  );
}

function CourseCard({ course, onRemove, onUpdate }) {
  const c = normalize(course);
  const exam = EXAM_TRACKS.find((e) => e.id === c.exam) || { name: c.exam };
  return (
    <div className="card-soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block px-2 py-0.5 text-[10.5px] font-semibold rounded-md bg-blue-100 text-blue-700 mb-2">{exam.name}</span>
          <div className="text-[15.5px] font-semibold text-slate-900 leading-tight">{c.name}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{c.subjects.length} subject{c.subjects.length === 1 ? '' : 's'}</div>
        </div>
        <button onClick={() => { onRemove(c.id); toast.success('Course removed'); }} className="w-8 h-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors" aria-label="Remove course">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {c.subjects.map((s) => <SubjectRow key={s.subject} s={s} />)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <select value={c.status || 'Active'} onChange={(e) => onUpdate(c.id, { status: e.target.value })}
          className={`text-[12px] font-medium rounded-md px-2 py-1 border transition-colors ${statusClass(c.status || 'Active')}`}>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { window.location.hash = `#course-overview?id=${encodeURIComponent(c.id)}`; }}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-900 transition-colors"
          data-testid="view-course-overview"
        >
          View overview <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onAdd, onAddCustom }) {
  return (
    <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden">
      <EmptyStateScene variant="book" className="absolute inset-0" />
      <div className="relative p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="text-[15.5px] font-semibold text-slate-900">No courses yet</div>
        <p className="text-[13.5px] text-slate-500 mt-1 max-w-[420px] mx-auto">Pick a syllabus (CBSE, IB, SAT…) or bring your own material to build a custom course.</p>
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <button onClick={onAdd} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium">
            <Plus className="w-5 h-5" /> Add your first course
          </button>
          {onAddCustom && (
            <button onClick={onAddCustom} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold border border-blue-300 text-blue-800 bg-white hover:bg-blue-50">
              <Sparkles className="w-5 h-5" /> + Custom Course
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyCourses() {
  const { state, removeCourse, updateCourse } = useApp();
  const courses = state.courses || [];
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-[14px] text-slate-500">Each course can contain multiple subjects, and every subject has its own exam date.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setOpen(true)} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-medium">
            <Plus className="w-5 h-5" /> Add course
          </button>
          <button onClick={() => setCustomOpen(true)} data-testid="add-custom-course" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-semibold border border-blue-300 text-blue-800 bg-white hover:bg-blue-50 transition-colors">
            <Sparkles className="w-5 h-5" /> + Custom Course
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} onAddCustom={() => setCustomOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onRemove={removeCourse} onUpdate={updateCourse} />
          ))}
        </div>
      )}

      {open && <CourseWizard mode="add-course" onClose={() => setOpen(false)} />}
      {customOpen && <CustomCourseWizard onClose={() => setCustomOpen(false)} />}
    </div>
  );
}
