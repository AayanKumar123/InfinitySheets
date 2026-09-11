import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBJECT_INFO } from '../../data/mock';
import { enrolledSubjects, subjectBoards, boardName, questionsForSubject } from '../../lib/subjects';
import { BookOpen, Eye, EyeOff, Sparkles, Library, ChevronRight, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import StudyDecor from '../decor/StudyDecor';
import CreateWorksheetButton from './CreateWorksheetButton';

// The Question Bank is a read-only view over the PAST-PAPER LIBRARY
// (state.pastPapers = seeded past papers + anything admins upload). Questions
// are grouped by the student's subjects, honouring each subject's board so a
// CBSE Mathematics course shows CBSE Mathematics past papers.

export default function QuestionBank({ go, subjectParam }) {
  const { state } = useApp();
  const track = state.user?.examTrack || 'SSLC';

  // Exact same subject list as "My subjects" (Dashboard / Start Studying).
  const chosenSubjects = useMemo(
    () => enrolledSubjects(state.courses, state.user?.subjects, track),
    [state.courses, state.user?.subjects, track],
  );
  const boards = useMemo(() => subjectBoards(state.courses, track), [state.courses, track]);

  // Past-paper questions grouped by subject, using the same selector as the
  // worksheet builder so the two lists can never drift apart.
  const questionsBySubject = useMemo(() => {
    const out = {};
    chosenSubjects.forEach((subject) => {
      out[subject] = questionsForSubject(state.pastPapers, subject, state.courses, track).map((p) => ({
        id: p.id,
        q: p.q,
        options: Array.isArray(p.options) ? p.options : [],
        a: p.a,
        topic: p.topic || 'General',
        difficulty: p.difficulty,
        answerType: p.answerType,
        board: p.board,
      }));
    });
    return out;
  }, [state.pastPapers, state.courses, chosenSubjects, track]);

  const decodedParam = subjectParam ? decodeURIComponent(subjectParam) : null;
  const startInBrowse = decodedParam && chosenSubjects.includes(decodedParam);
  const [mode, setMode] = useState(startInBrowse ? 'browse' : 'select');
  const [active, setActive] = useState(startInBrowse ? decodedParam : (chosenSubjects[0] || null));

  const openSubject = (s) => { setActive(s); setMode('browse'); };
  const backToSubjects = () => setMode('select');

  if (mode === 'select') {
    return (
      <SubjectPicker
        subjects={chosenSubjects}
        questionsBySubject={questionsBySubject}
        boards={boards}
        onPick={openSubject}
      />
    );
  }

  return (
    <BrowseSubject
      subject={active}
      chosenSubjects={chosenSubjects}
      questionsBySubject={questionsBySubject}
      boards={boards}
      onBack={backToSubjects}
      onSwitchSubject={openSubject}
      go={go}
    />
  );
}

// --------------------------------------------------------------------------
// Subject picker (landing screen)
// --------------------------------------------------------------------------

function SubjectPicker({ subjects, questionsBySubject, boards, onPick }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 opacity-60"><StudyDecor /></div>
      <div className="mb-6">
        <p className="text-[14px] text-slate-500 max-w-[640px]">Browse real past-paper questions from the library, organised by your subjects. Pick a subject to get started.</p>
        <div className="text-[12px] text-slate-500 mt-1">{subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'} in your courses</div>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-white">
          <Library className="w-6 h-6 text-slate-400 mx-auto mb-3" />
          <div className="text-[14px] font-medium text-slate-700">No subjects yet</div>
          <div className="text-[12.5px] text-slate-500 mt-1">Add a course to browse its past-paper questions here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="qbank-subject-grid">
          {subjects.map((s) => {
            const info = SUBJECT_INFO[s] || { emoji: '\u25A0' };
            const qs = questionsBySubject[s] || [];
            const count = qs.length;
            const topicCount = new Set(qs.map((q) => q.topic)).size;
            const b = boards[s];
            return (
              <button
                key={s}
                onClick={() => onPick(s)}
                data-testid={`qbank-subject-${s.replace(/\s+/g, '-')}`}
                className="group text-left card-soft p-5 border border-[color:var(--color-border)] hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-[22px]">{info.emoji}</div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-[16.5px] font-semibold text-slate-900">{s}</div>
                {b && b.board !== s && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] tracking-[0.1em] uppercase font-semibold text-blue-700">{boardName(b.board)}</span>
                    {b.ibLevel && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">{b.ibLevel}</span>
                    )}
                  </div>
                )}
                <div className="text-[12.5px] text-slate-500 mt-1">
                  {count} {count === 1 ? 'past-paper question' : 'past-paper questions'}{count > 0 ? ` · ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}` : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Browse a single subject
// --------------------------------------------------------------------------

function BrowseSubject({ subject, chosenSubjects, questionsBySubject, boards, onBack, onSwitchSubject, go }) {
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState({});
  const list = useMemo(() => questionsBySubject[subject] || [], [questionsBySubject, subject]);

  const filtered = useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((x) =>
      x.q.toLowerCase().includes(q)
      || x.topic.toLowerCase().includes(q)
      || (x.options || []).some((o) => String(o).toLowerCase().includes(q))
    );
  }, [list, query]);

  const launchPractice = (topic) => {
    window.sessionStorage.setItem('preselect_subject', subject);
    // No topic means "whole subject" — clear any stale preselection.
    if (topic) window.sessionStorage.setItem('preselect_topic', topic);
    else window.sessionStorage.removeItem('preselect_topic');
    go('worksheets');
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 opacity-60"><StudyDecor /></div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onBack}
          data-testid="qbank-back"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All subjects
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[14px] text-slate-500 max-w-[640px]">Past-paper questions from the library, organised by topic.</p>
          <div className="text-[12px] text-slate-500 mt-1">{list.length} {list.length === 1 ? 'question' : 'questions'} in this subject</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions or topics" className="input-base pl-8 w-[260px]" />
          </div>
          <CreateWorksheetButton
            onClick={() => launchPractice(null)}
            data-testid="qbank-create-worksheet"
          />
        </div>
      </div>

      {chosenSubjects.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {chosenSubjects.map((s) => {
            const info = SUBJECT_INFO[s] || { emoji: '\u25A0' };
            const sel = subject === s;
            return (
              <button key={s} onClick={() => onSwitchSubject(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium border transition-colors ${sel ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-[color:var(--color-border)] text-slate-700 hover:bg-slate-100'}`}>
                <span className="text-[14px] leading-none">{info.emoji}</span>
                <span>{s}</span>
                <span className="text-[11px] text-slate-500">{(questionsBySubject[s] || []).length}</span>
              </button>
            );
          })}
        </div>
      )}

      <SubjectQuestions subject={subject} board={boards[subject]?.board} questions={filtered} totalInSubject={list.length} revealed={revealed} setRevealed={setRevealed} launchPractice={launchPractice} />
    </div>
  );
}

function SubjectQuestions({ subject, board, questions, totalInSubject, revealed, setRevealed, launchPractice }) {
  const info = SUBJECT_INFO[subject] || { emoji: '\u25A0' };
  const byTopic = useMemo(() => {
    const m = {};
    questions.forEach((q) => { (m[q.topic] = m[q.topic] || []).push(q); });
    return m;
  }, [questions]);

  if (questions.length === 0) {
    // Distinguish "subject genuinely has no past papers yet" from "search
    // filtered everything out".
    const emptySubject = totalInSubject === 0;
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] p-10 text-center bg-white">
        <Library className="w-6 h-6 text-slate-400 mx-auto mb-3" />
        <div className="text-[14px] font-medium text-slate-700">
          {emptySubject ? 'No past-paper questions for this subject yet' : 'No questions match your search'}
        </div>
        <div className="text-[12.5px] text-slate-500 mt-1">
          {emptySubject
            ? 'The past-paper library does not have questions for this subject yet. An admin can add some.'
            : 'Try a different keyword or clear the search to see all questions.'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card-soft p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[18px]">{info.emoji}</div>
            <div className="min-w-0">
              <div className="text-[15.5px] font-semibold text-slate-900">{subject}</div>
              <div className="text-[12px] text-slate-500">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'} · from the past-paper library{board ? ` · ${boardName(board)}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {Object.entries(byTopic).map(([topic, qs]) => (
        <TopicGroup key={topic} topic={topic} questions={qs} revealed={revealed} setRevealed={setRevealed} onPractice={() => launchPractice(topic)} />
      ))}
    </div>
  );
}

function TopicGroup({ topic, questions, revealed, setRevealed, onPractice }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center"><BookOpen className="w-4 h-4" /></span>
          <div>
            <div className="text-[14px] font-semibold text-slate-900">{topic}</div>
            <div className="text-[11.5px] text-slate-500">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</div>
          </div>
        </div>
        <button onClick={onPractice} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white bg-blue-600 hover:opacity-95">
          <Sparkles className="w-4 h-4" /> Practice these
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {questions.map((q) => {
          const isRevealed = revealed[q.id];
          return (
            <div key={q.id} className="rounded-md border border-[color:var(--color-border)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[13.5px] text-slate-800 font-medium leading-snug">{q.q}</div>
                <button onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] text-slate-600 hover:bg-slate-100 transition-colors">
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {isRevealed ? 'Hide' : 'Reveal'}
                </button>
              </div>
              {q.options.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.a;
                    const show = isRevealed && isCorrect;
                    return (
                      <div key={`${q.id}-${idx}`} className={`px-3 py-2 rounded-md border text-[13px] flex items-center gap-2 ${show ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 font-medium' : 'border-[color:var(--color-border)] text-slate-700'}`}>
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10.5px] font-semibold">{String.fromCharCode(65 + idx)}</span>
                        <span className="flex-1">{opt}</span>
                        {show && <ChevronRight className="w-4 h-4 text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
