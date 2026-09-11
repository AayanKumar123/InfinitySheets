import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBJECTS, SUBJECT_INFO, EXAM_TRACKS } from '../../data/mock';
import { enrolledSubjects, subjectBoards, boardName, tracksOffering, defaultBoardFor } from '../../lib/subjects';

import { BookOpen, ArrowRight, Search, Plus, X, Trash2, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
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

export default function StartStudying({ go, subjectParam }) {
  const { state, updateCourse, addCourse, removeCourse } = useApp();
  const track = state.user?.examTrack || 'SSLC';
  const courses = state.courses;
  const userSubjects = state.user?.subjects;
  const list = useMemo(() => enrolledSubjects(courses, userSubjects, track), [courses, userSubjects, track]);
  const boards = useMemo(() => subjectBoards(courses, track), [courses, track]);

  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();

  // Which subject the "+ Add Subject" flow is targeting (null = modal closed).
  const [addTarget, setAddTarget] = useState(null);
  // Collapsed by default so the student's own subjects stay front and centre.
  const [notTakenOpen, setNotTakenOpen] = useState(false);

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
  // A search always expands the not-taken list so results are visible.
  const notTakenExpanded = !!trimmed || notTakenOpen;

  const openOverview = (s) => { window.location.hash = `#study?subject=${encodeURIComponent(s)}`; };

  const subjectInCourse = (s) => (courses || []).some((c) => {
    const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [c.subject] : []);
    return subs.some((e) => (typeof e === 'string' ? e : e?.subject) === s);
  });

  // Append a subject to an existing course. Idempotent. For IB courses an
  // HL/SL level is captured and stored on the subject entry.
  const addSubjectToCourse = (courseId, ibLevel) => {
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
    const entry = { subject: addTarget, ...(ibLevel ? { ibLevel } : {}) };
    updateCourse(courseId, { subjects: [...subs, entry] });
    toast.success(`Added ${addTarget} to ${course.name}`);
    setAddTarget(null);
  };

  // Create a brand-new course on the spot containing this subject.
  const createCourseWithSubject = ({ name, board, ibLevel }) => {
    if (!addTarget) return;
    const exam = board || defaultBoardFor(addTarget, track);
    const entry = { subject: addTarget, ...(exam === 'IB' && ibLevel ? { ibLevel } : {}) };
    const courseName = (name || '').trim() || `${boardName(exam)} \u00b7 ${addTarget}`;
    addCourse({ name: courseName, exam, subjects: [entry], status: 'Active' });
    toast.success(`Created ${courseName} and added ${addTarget}`);
    setAddTarget(null);
  };

  // Drop a subject from every course that contains it. Empty courses are
  // removed so the student doesn't end up with a course with no subjects.
  const removeSubject = (s) => {
    if (!subjectInCourse(s)) return;
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${s} from your courses?`)) return;
    let count = 0;
    (courses || []).forEach((c) => {
      const subs = Array.isArray(c.subjects) ? c.subjects : (c.subject ? [{ subject: c.subject }] : []);
      const has = subs.some((e) => (typeof e === 'string' ? e : e?.subject) === s);
      if (!has) return;
      const next = subs.filter((e) => (typeof e === 'string' ? e : e?.subject) !== s);
      if (next.length === 0) removeCourse(c.id);
      else updateCourse(c.id, { subjects: next });
      count += 1;
    });
    if (count) toast.success(`Removed ${s}`);
  };

  const renderCard = (s, taken) => {
    const info = SUBJECT_INFO[s] || { emoji: '\u25A0', tagline: 'Practice and improve.', tone: 'primary' };
    const removable = taken && subjectInCourse(s);
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
          {!taken && (() => {
            const offered = tracksOffering(s).filter((id) => id !== s);
            if (offered.length === 0) return null;
            const shown = offered.slice(0, 3).map(boardName).join(' \u00b7 ');
            const extra = offered.length - 3;
            return (
              <div className="relative mt-1 text-[11px] tracking-[0.08em] uppercase font-semibold text-slate-500" data-testid={`subject-offered-${s}`}>
                {shown}{extra > 0 ? ` +${extra}` : ''}
              </div>
            );
          })()}
          {taken && boards[s] && boards[s].board !== s && (
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
        {removable && (
          <button
            onClick={() => removeSubject(s)}
            data-testid={`remove-subject-${s}`}
            className="relative mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-rose-600 border border-rose-200 bg-rose-50/60 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Remove
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
                {!trimmed && notTakenMatches.length > 0 && (
                  <button
                    onClick={() => setNotTakenOpen((o) => !o)}
                    data-testid="toggle-not-taken"
                    className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {notTakenExpanded ? <>Hide <ChevronUp className="w-4 h-4" /></> : <>Show <ChevronDown className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
              {notTakenMatches.length === 0 ? (
                <div className="text-[13px] text-slate-500 rounded-xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-6 text-center">
                  {trimmed ? 'No other subjects match this search.' : 'You have added every available subject.'}
                </div>
              ) : notTakenExpanded ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notTakenMatches.map((s) => renderCard(s, false))}
                </div>
              ) : (
                <button
                  onClick={() => setNotTakenOpen(true)}
                  data-testid="expand-not-taken"
                  className="w-full rounded-xl border border-dashed border-[color:var(--color-border)] bg-white px-4 py-4 text-center text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ChevronDown className="w-4 h-4" /> Show {notTakenMatches.length} more {notTakenMatches.length === 1 ? 'subject' : 'subjects'} you can add
                </button>
              )}
            </section>
          </>
        )}
      </div>

      {addTarget && (
        <AddSubjectModal
          subject={addTarget}
          courses={courses}
          track={track}
          examTracks={EXAM_TRACKS}
          onAddToCourse={addSubjectToCourse}
          onCreateCourse={createCourseWithSubject}
          onClose={() => setAddTarget(null)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Add-subject modal: pick an existing course (capturing HL/SL for IB) OR
// create a brand-new course on the spot.
// --------------------------------------------------------------------------
function AddSubjectModal({ subject, courses, track, examTracks, onAddToCourse, onCreateCourse, onClose }) {
  const hasCourses = (courses || []).length > 0;
  const [tab, setTab] = useState(hasCourses ? 'existing' : 'new');

  // For an IB existing course, we reveal an inline HL/SL choice before adding.
  const [pendingId, setPendingId] = useState(null);
  const [pendingLevel, setPendingLevel] = useState('HL');

  // New-course form.
  const [newName, setNewName] = useState('');
  // Only curricula that actually teach this subject are valid homes for it.
  const offering = tracksOffering(subject);
  const allowedTracks = (examTracks || []).filter((t) => offering.length === 0 || offering.includes(t.id));
  const [newBoard, setNewBoard] = useState(defaultBoardFor(subject, track));
  const [newLevel, setNewLevel] = useState('HL');

  const boardOfCourse = (c) => c.exam || track;

  const clickExisting = (c) => {
    if (boardOfCourse(c) === 'IB') {
      setPendingId((prev) => (prev === c.id ? null : c.id));
    } else {
      onAddToCourse(c.id);
    }
  };

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      data-testid={`add-tab-${id}`}
      className={`flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold border transition-colors ${tab === id ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-[color:var(--color-border)] bg-white text-slate-600 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  );

  const LevelToggle = ({ value, onChange, idPrefix }) => (
    <div className="flex items-center gap-2" role="group" aria-label="IB level">
      {['HL', 'SL'].map((lvl) => (
        <button
          key={lvl}
          onClick={() => onChange(lvl)}
          data-testid={`${idPrefix}-${lvl}`}
          aria-pressed={value === lvl}
          className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold border transition-colors ${value === lvl ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-[color:var(--color-border)] text-slate-600 hover:bg-slate-100'}`}
        >
          {lvl}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="add-subject-modal"
    >
      <div
        className="w-full max-w-[460px] bg-white rounded-2xl border border-[color:var(--color-border)] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[color:var(--color-border)]">
          <div>
            <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-blue-600">Add subject</div>
            <h3 className="text-[18px] font-semibold text-slate-900 mt-0.5">Add &ldquo;{subject}&rdquo; to a course</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasCourses && (
          <div className="flex items-center gap-2 px-5 pt-4">
            {tabBtn('existing', 'Existing course')}
            {tabBtn('new', 'New course')}
          </div>
        )}

        <div className="p-5">
          {tab === 'existing' && hasCourses && (
            <>
              <p className="text-[13px] text-slate-500 mb-3">Choose which course this subject belongs to:</p>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-auto">
                {(courses || []).map((c) => {
                  const subCount = Array.isArray(c.subjects) ? c.subjects.length : (c.subject ? 1 : 0);
                  const isIB = boardOfCourse(c) === 'IB';
                  const open = pendingId === c.id;
                  const teaches = offering.length === 0 || offering.includes(boardOfCourse(c));
                  return (
                    <div key={c.id} className={`rounded-xl border border-[color:var(--color-border)] bg-white ${teaches ? '' : 'opacity-60'}`}>
                      <button
                        onClick={() => teaches && clickExisting(c)}
                        disabled={!teaches}
                        title={teaches ? undefined : `${boardName(boardOfCourse(c))} does not offer ${subject}`}
                        data-testid={isIB ? `pick-course-${c.id}` : `add-to-course-${c.id}`}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 rounded-xl ${teaches ? 'hover:bg-blue-50' : 'cursor-not-allowed'}`}
                      >
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-slate-900 truncate">{c.name}</div>
                          <div className="text-[11.5px] text-slate-500">{boardName(boardOfCourse(c))} · {subCount} {subCount === 1 ? 'subject' : 'subjects'}{teaches ? '' : ` · does not offer ${subject}`}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold shrink-0 ${teaches ? 'text-blue-700' : 'text-slate-400'}`}>
                          {!teaches ? 'Not available' : isIB ? (open ? 'Choose level' : 'Select') : <><Plus className="w-4 h-4" /> Add</>}
                        </span>
                      </button>
                      {isIB && open && (
                        <div className="px-4 pb-3 pt-1 flex items-center justify-between gap-3 border-t border-[color:var(--color-border)]">
                          <span className="text-[12px] text-slate-500">Level for {subject}</span>
                          <div className="flex items-center gap-2">
                            <LevelToggle value={pendingLevel} onChange={setPendingLevel} idPrefix={`existing-level-${c.id}`} />
                            <button
                              onClick={() => onAddToCourse(c.id, pendingLevel)}
                              data-testid={`add-to-course-${c.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white bg-blue-600 hover:opacity-95"
                            >
                              <Plus className="w-4 h-4" /> Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'new' && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Course name (optional)</span>
                <input
                  className="input-base"
                  placeholder={`e.g., ${boardName(newBoard)} ${subject}`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  data-testid="new-course-name"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">Exam board</span>
                <select
                  className="input-base"
                  value={newBoard}
                  onChange={(e) => setNewBoard(e.target.value)}
                  data-testid="new-course-board"
                >
                  {allowedTracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              {newBoard === 'IB' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-slate-600">Higher or Standard Level?</span>
                  <LevelToggle value={newLevel} onChange={setNewLevel} idPrefix="new-level" />
                </div>
              )}
              <button
                onClick={() => onCreateCourse({ name: newName, board: newBoard, ibLevel: newBoard === 'IB' ? newLevel : undefined })}
                data-testid="create-course-submit"
                className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 transition-opacity"
              >
                <GraduationCap className="w-5 h-5" /> Create course & add {subject}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
