import React from 'react';
import { useApp } from '../../context/AppContext';
import { EXAM_TRACKS, SUBJECT_INFO, TOPICS, TOPIC_SUMMARY } from '../../data/mock';
import { ArrowLeft, BookOpen, GraduationCap, CalendarClock, ArrowRight } from 'lucide-react';
import InfinityBackground from '../decor/InfinityBackground';
import CreateWorksheetButton from './CreateWorksheetButton';

function normalize(course) {
  if (!course) return null;
  if (Array.isArray(course.subjects)) return course;
  return { ...course, subjects: [{ subject: course.subject, examDate: course.examDate, target: course.target, level: course.level }] };
}

function daysUntil(d) {
  if (!d) return null;
  return Math.max(0, Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function TopicRow({ topic, subjectEntry }) {
  const overrideSummary = subjectEntry && subjectEntry.topicSummaries && subjectEntry.topicSummaries[topic];
  const summary = overrideSummary || TOPIC_SUMMARY[topic] || 'Curated practice questions to build confidence in this topic.';
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border)] bg-white p-3.5 hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
      <span className="w-8 h-8 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
        <BookOpen className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-slate-900">{topic}</div>
        <div className="text-[12.5px] text-slate-500 mt-0.5 leading-snug">{summary}</div>
      </div>
    </div>
  );
}

function SubjectBlock({ s, onStudy }) {
  const info = SUBJECT_INFO[s.subject] || { emoji: '\u25A0' };
  // Custom courses can bring their own topics on the subject entry. Fall back
  // to the built-in TOPICS map for standard subjects.
  const topics = (Array.isArray(s.topics) && s.topics.length) ? s.topics : (TOPICS[s.subject] || []);
  const days = daysUntil(s.examDate);
  return (
    <div className="card-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-[20px]">{info.emoji}</div>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-slate-900 truncate">{s.subject}</div>
            <div className="text-[12px] text-slate-500 mt-0.5">{topics.length} {topics.length === 1 ? 'topic' : 'topics'}{s.examDate ? ` · exam on ${new Date(s.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {days !== null && (
            <div className="rounded-md border border-violet-200/60 bg-violet-50 px-3 py-1.5 text-right min-w-[86px]">
              <div className="text-[9.5px] tracking-wider uppercase font-semibold text-violet-700">Days left</div>
              <div className="text-[15px] font-semibold text-slate-900 tabular-nums leading-tight">{days}</div>
            </div>
          )}
          <button
            onClick={() => onStudy(s.subject)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-blue-600 hover:opacity-95 transition-opacity"
          >
            Study <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="text-[12.5px] text-slate-500 italic">Topics for this subject will be added soon.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {topics.map((t) => <TopicRow key={t} topic={t} subjectEntry={s} />)}
        </div>
      )}
    </div>
  );
}

export default function CourseOverview({ courseId, go }) {
  const { state } = useApp();
  const courses = (state.courses || []).map(normalize);
  const course = courses.find((c) => c && c.id === courseId) || courses[0];

  if (!course) {
    return (
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white p-10 text-center">
        <GraduationCap className="w-6 h-6 text-slate-400 mx-auto mb-3" />
        <div className="text-[15px] font-medium text-slate-700">No course found</div>
        <div className="text-[13px] text-slate-500 mt-1">Add a course first to see its overview.</div>
        <button onClick={() => go && go('courses')} className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-blue-600 hover:opacity-95">
          Go to My Courses
        </button>
      </div>
    );
  }

  const exam = EXAM_TRACKS.find((e) => e.id === course.exam) || { name: course.exam || 'Custom' };
  const totalTopics = course.subjects.reduce((acc, s) => acc + ((Array.isArray(s.topics) && s.topics.length) ? s.topics.length : (TOPICS[s.subject]?.length || 0)), 0);

  const onStudy = (subject) => {
    window.location.hash = `#study?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div className="relative">
      <InfinityBackground variant="soft" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => go && go('courses')} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to My Courses
          </button>
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl text-white mb-5" data-testid="course-overview-hero">
          <div className="absolute inset-0 bg-blue-700" />
          <div className="absolute inset-0 grid-fade opacity-60" />
          <div className="relative p-7 lg:p-9">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur border border-white/20 text-[11px] tracking-[0.14em] uppercase font-semibold">
                <GraduationCap className="w-4 h-4" /> {exam.name} · Course overview
              </span>
            </div>
            <div className="text-[28px] font-semibold tracking-tight leading-tight">{course.name}</div>
            <div className="text-[13.5px] text-white/85 mt-1">
              {course.subjects.length} {course.subjects.length === 1 ? 'subject' : 'subjects'} · {totalTopics} {totalTopics === 1 ? 'topic' : 'topics'} to master
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <CreateWorksheetButton onClick={() => { window.location.hash = '#worksheets'; }} />
              <button
                onClick={() => { window.location.hash = '#study'; }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors text-[13px] font-medium"
              >
                <BookOpen className="w-5 h-5" /> Start Studying
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {course.subjects.map((s, i) => {
            // Older / imported courses may list plain subject names.
            const entry = typeof s === 'string' ? { subject: s } : s;
            return <SubjectBlock key={entry.subject || i} s={entry} onStudy={onStudy} />;
          })}
        </div>
      </div>
    </div>
  );
}
