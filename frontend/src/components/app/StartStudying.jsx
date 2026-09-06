import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBJECTS, SUBJECT_INFO, EXAM_TRACKS } from '../../data/mock';

const boardName = (id) => EXAM_TRACKS.find((t) => t.id === id)?.name || id;
import { BookOpen, ArrowRight, Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import InfinityBackground from '../decor/InfinityBackground';
import SubjectOverview from './SubjectOverview';
import CreateWorksheetButton from './CreateWorksheetButton';

const toneBadge = {
  primary: 'bg-blue-100 text-blue-700',
  violet: 'bg-blue-100 text-blue-700',
  blue: 'bg-violet-100 text-violet-700',
  secondary: 'bg-violet-100 text-violet-700',
  cyan: 'bg-red-100 text-red-700',
  accent: 'bg-red-100 text-red-700',
  success: 'bg-emerald-100 text-emerald-700',
};

// Flatten every subject available across all exam tracks, deduped.
function buildAllSubjects() {
  const seen = new Set();
  const out = [];
  Object.values(SUBJECTS).forEach((arr) => {
    arr.forEach((s) => {
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    });
  });
  return out.sort((a, b) => a.localeCompare(b));
}

const ALL_SUBJECTS = buildAllSubjects();

// Derive the subjects the student has actually enrolled in. Priority:
// 1) subjects inside their added courses (CourseWizard + CustomCourseWizard)
// 2) subjects picked during onboarding
// 3) every subject in the active exam track
// Which board does each subject actually belong to? Courses carry their own
// `exam` value, so a student taking IGCSE Physics and IB Economics sees the
// right board on each card instead of the single global exam track (which
// defaulted to CBSE for everyone).
function subjectBoards(courses, fallbackTrack) {
  const map = {};
  (courses || []).forEach((c) => {
    const board = c.exam || fallbackTrack;
    const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
    subs.forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.subject;
      if (!name) return;
      if (!map[name]) map[name] = { board, ibLevel: typeof entry === 'object' ? entry?.ibLevel : undefined };
    });
  });
  return map;
}

function enrolledSubjects(courses, userSubjects, track) {
  const trackSubs = SUBJECTS[track] || [];
  const fromCourses = [];
  (courses || []).forEach((c) => {
    const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
    subs.forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.subject;
      if (name && !fromCourses.includes(name)) fromCourses.push(name);
    });
  });
  if (fromCourses.length) return fromCourses;
  const fromUser = userSubjects || [];
  if (fromUser.length) return fromUser;
  return trackSubs;
}

export default function StartStudying({ go, subjectParam }) {
  const { state, updateCourse } = useApp();
  const track = state.user?.examTrack || 'SSLC';
  const courses = state.courses;
  const userSubjects = state.user?.subjects;
  const list = useMemo(() => enrolledSubjects(courses, userSubjects, track), [courses, userSubjects, track]);
  const boards = useMemo(() => subjectBoards(courses, track), [courses, track]);

  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();

  // Which subject the "+ Add Subject" flow is targeting (null = modal closed).
  const [addTarget, setAddTarget] = useState(null);

  // Split subjects into the ones the student has taken vs. everything else,
  // each filtered by the search query when one is present.
  const takenMatches = useMemo(
    () => (trimmed ? list.filter((s) => s.toLowerCase().includes(trimmed)) : list),
    [trimmed, list],
  );
  const notTakenMatches = useMemo(() => {
    const rest = ALL_SUBJECTS.filter((s) => !list.includes(s));
    return trimmed ? rest.filter((s) => s.toLowerCase().includes(trimmed)) : rest;
  }, [trimmed, list]);
  const noMatches = trimmed && takenMatches.length === 0 && notTakenMatches.length === 0;

  const openOverview = (s) => { window.location.hash = `#study?subject=${encodeURIComponent(s)}`; };

  // Append a not-taken subject to a course the student picks. Idempotent —
  // guards against adding a subject a course already contains.
  const addSubjectToCourse = (courseId) => {
    const course = (courses || []).find((c) => c.id === courseId);
    if (!course || !addTarget) return;
    const subs = Array.isArray(course.subjects)
      ? course.subjects
      : (course.subject ? [{ subject: course.subject }] : []);
    const already = subs.some((e) => (typeof e === 'string' ? e : e?.subject) === addTarget);
    if (already) {
      toast.info(`${addTarget} is already in ${course.name}`);
      setAddTarget(null);
      return;
    }
    updateCourse(courseId, { subjects: [...subs, { subject: addTarget }] });
    toast.success(`Added ${addTarget} to ${course.name}`);
    setAddTarget(null);
  };

  const renderCard = (s, taken) => {
    const info = SUBJECT_INFO[s] || { emoji: '\u25A0', tagline: 'Practice and improve.', tone: 'primary' };
    return (
      <div key={s} className="group relative card-soft p-5 overflow-hidden flex flex-col" data-testid={`subject-tile-${s}`}>
        <button
          onClick={() => openOverview(s)}
          data-testid={`subject-open-${s}`}
          className="relative text-left flex-1 focus:outline-none"
        >
          <div className="relative flex items-start justify-between gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-semibold ${toneBadge[info.tone] || toneBadge.primary}`}>{info.emoji}</div>
            <div className="flex items-center gap-2">
              {!taken && (
                <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">Explore</span>
              )}
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
          <div className="relative mt-4 text-[16.5px] font-semibold text-slate-900">{s}</div>
          {taken && boards[s] && (
            <div className="relative mt-1 flex items-center gap-1.5">
              <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-blue-700" data-testid={`subject-board-${s}`}>
                {boardName(boards[s].board)}
              </span>
              {boards[s].ibLevel && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {boards[s].ibLevel}
                </span>
              )}
            </div>
          )}
          {!taken && (
            <div className="relative mt-1 text-[12.5px] text-slate-500 line-clamp-1">{info.tagline}</div>
          )}
        </button>
        {!taken && (
          <button
            onClick={() => setAddTarget(s)}
            data-testid={`add-subject-${s}`}
            className="relative mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-blue-700 border border-blue-300 bg-blue-50/60 hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        )}
      </div>
    );
  };

  if (subjectParam) {
    const decoded = decodeURIComponent(subjectParam);
    if (ALL_SUBJECTS.includes(decoded)) {
      return <SubjectOverview subject={decoded} go={go} onBack={() => { window.location.hash = '#study'; }} />;
    }
  }

  return (
    <div className="relative">
      <InfinityBackground variant="soft" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <p className="text-[14px] text-slate-500 max-w-[640px]">Pick a subject to see its overview and create a worksheet tailored to your level.</p>
          <CreateWorksheetButton
            onClick={() => { window.location.hash = '#worksheets'; }}
            data-testid="create-worksheet-btn"
            className="shrink-0"
          />
        </div>
        <div className="relative mb-5 max-w-[480px]" data-testid="study-search">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all subjects (Mathematics, Calculus, Biology…)"
            className="input-base w-full pl-10 pr-9"
            aria-label="Search subjects"
            data-testid="study-search-input"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
        {trimmed && (
          <div className="text-[12px] text-slate-500 mb-3" data-testid="study-search-meta">
            {takenMatches.length + notTakenMatches.length} {takenMatches.length + notTakenMatches.length === 1 ? 'subject' : 'subjects'} match &ldquo;{query.trim()}&rdquo;
          </div>
        )}

        {noMatches ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white p-10 text-center">
            <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-3" />
            <div className="text-[14px] font-medium text-slate-700">No subjects match &ldquo;{query.trim()}&rdquo;</div>
            <div className="text-[12.5px] text-slate-500 mt-1">Try a different keyword, or clear the search.</div>
            <button onClick={() => setQuery('')} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700">
              Clear search
            </button>
          </div>
        ) : (
          <>
            <section className="mb-8" data-testid="subjects-taken">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[15px] font-semibold text-slate-900">Subjects Taken</h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 tabular-nums">{takenMatches.length}</span>
              </div>
              {takenMatches.length === 0 ? (
                <div className="text-[13px] text-slate-500 rounded-xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-6 text-center">
                  {trimmed ? 'None of your subjects match this search.' : 'You have not added any subjects yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {takenMatches.map((s) => renderCard(s, true))}
                </div>
              )}
            </section>

            <section data-testid="subjects-not-taken">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[15px] font-semibold text-slate-900">Subjects Not Taken</h3>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 tabular-nums">{notTakenMatches.length}</span>
              </div>
              {notTakenMatches.length === 0 ? (
                <div className="text-[13px] text-slate-500 rounded-xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-6 text-center">
                  {trimmed ? 'No other subjects match this search.' : 'You have added every available subject.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notTakenMatches.map((s) => renderCard(s, false))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {addTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setAddTarget(null)}
          data-testid="add-subject-modal"
        >
          <div
            className="w-full max-w-[440px] bg-white rounded-2xl border border-[color:var(--color-border)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[color:var(--color-border)]">
              <div>
                <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-blue-600">Add subject</div>
                <h3 className="text-[18px] font-semibold text-slate-900 mt-0.5">Add &ldquo;{addTarget}&rdquo; to a course</h3>
              </div>
              <button
                onClick={() => setAddTarget(null)}
                className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {(courses || []).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[13.5px] text-slate-600">You do not have any courses yet. Create one first, then add subjects to it.</p>
                  <button
                    onClick={() => { setAddTarget(null); window.location.hash = '#courses'; }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-blue-600 hover:opacity-95 transition-opacity"
                  >
                    Go to My Courses
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-slate-500 mb-3">Choose which course this subject belongs to:</p>
                  <div className="flex flex-col gap-2 max-h-[280px] overflow-auto">
                    {(courses || []).map((c) => {
                      const subCount = Array.isArray(c.subjects) ? c.subjects.length : (c.subject ? 1 : 0);
                      return (
                        <button
                          key={c.id}
                          onClick={() => addSubjectToCourse(c.id)}
                          data-testid={`add-to-course-${c.id}`}
                          className="group text-left rounded-xl border border-[color:var(--color-border)] bg-white hover:border-blue-400 hover:bg-blue-50 px-4 py-3 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold text-slate-900 truncate">{c.name}</div>
                            <div className="text-[11.5px] text-slate-500">{boardName(c.exam || track)} · {subCount} {subCount === 1 ? 'subject' : 'subjects'}</div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-blue-700 shrink-0">
                            <Plus className="w-4 h-4" /> Add
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
