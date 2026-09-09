import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBJECTS, SUBJECT_INFO, EXAM_TRACKS } from '../../data/mock';

const boardName = (id) => EXAM_TRACKS.find((t) => t.id === id)?.name || id;
import { BookOpen, ArrowRight, Search } from 'lucide-react';
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
  const { state } = useApp();
  const track = state.user?.examTrack || 'SSLC';
  const courses = state.courses;
  const userSubjects = state.user?.subjects;
  const list = useMemo(() => enrolledSubjects(courses, userSubjects, track), [courses, userSubjects, track]);
  const boards = useMemo(() => subjectBoards(courses, track), [courses, track]);

  // Drive the grid from the search query if the user has typed something;
  // otherwise show the student's enrolled subjects. Search runs against
  // ALL_SUBJECTS (the "course directories"), and the student's enrolled
  // subjects are listed first so their usual subjects stay discoverable.
  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();
  const grid = useMemo(() => {
    if (!trimmed) return list;
    const matches = ALL_SUBJECTS.filter((s) => s.toLowerCase().includes(trimmed));
    const enrolledFirst = matches.filter((s) => list.includes(s));
    const rest = matches.filter((s) => !list.includes(s));
    return [...enrolledFirst, ...rest];
  }, [trimmed, list]);

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
            {grid.length} {grid.length === 1 ? 'subject' : 'subjects'} match &ldquo;{query.trim()}&rdquo;
            {grid.some((s) => !list.includes(s)) && ' · showing your subjects first'}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grid.map((s) => {
            const info = SUBJECT_INFO[s] || { emoji: '\u25A0', tagline: 'Practice and improve.', tone: 'primary' };
            const isEnrolled = list.includes(s);
            return (
              <button key={s} onClick={() => { window.location.hash = `#study?subject=${encodeURIComponent(s)}`; }} className="group relative text-left card-soft p-5 overflow-hidden">
                <div className="relative flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[22px] font-semibold ${toneBadge[info.tone] || toneBadge.primary}`}>{info.emoji}</div>
                  <div className="flex items-center gap-2">
                    {!isEnrolled && (
                      <span className="text-[10px] tracking-[0.12em] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">Explore</span>
                    )}
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
                <div className="relative mt-4 text-[16.5px] font-semibold text-slate-900">{s}</div>
                {boards[s] && (
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
              </button>
            );
          })}
          {grid.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white p-10 text-center">
              <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-3" />
              <div className="text-[14px] font-medium text-slate-700">No subjects match &ldquo;{query.trim()}&rdquo;</div>
              <div className="text-[12.5px] text-slate-500 mt-1">Try a different keyword, or clear the search to see your subjects.</div>
              <button onClick={() => setQuery('')} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12.5px] font-semibold border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700">
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
