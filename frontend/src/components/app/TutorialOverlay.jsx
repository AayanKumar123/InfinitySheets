import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, X, Sparkles, ArrowRight } from 'lucide-react';

// Each step navigates the real app to a route, then shows a floating tooltip
// describing what the user is seeing. Optionally highlights a sidebar nav item.
const STEPS = [
  {
    route: 'course-overview',
    target: 'courses',
    eyebrow: 'Welcome',
    title: 'Your course overview',
    body: 'Every topic in your course with a summary, exam dates per subject and a countdown. Come back anytime from My Courses.',
    bullets: ['Every topic, per subject', 'Exam date and days left per subject', 'Jump straight into a subject'],
  },
  {
    route: 'dashboard',
    target: 'dashboard',
    eyebrow: 'Step 1',
    title: 'Your dashboard',
    body: 'Days to your exam (click the pencil to change it), predicted grade, your latest AI diagnosis, weekly goal, this-week summary, study streak and where that streak is taking you.',
    bullets: ['"Study next" topics under each subject', 'Spaced reviews that are due', 'Streak heatmap + grade projection'],
  },
  {
    route: 'courses',
    target: 'courses',
    eyebrow: 'Step 2',
    title: 'Add your courses',
    body: 'Courses group subjects under an exam board: CBSE, IB (with HL/SL), IGCSE, AP, SAT and more, or a custom course from your own material. Everything else is tailored to these.',
    bullets: ['Multiple courses and boards at once', 'Per-subject exam dates', 'Custom courses from your files'],
  },
  {
    route: 'study',
    target: 'study',
    eyebrow: 'Step 3',
    title: 'Start Studying',
    body: 'Open a subject for its overview, then open any topic: an AI overview of exactly what the exam wants (with sources), official links, and a tutor you can ask doubts.',
    bullets: ['Topic overview cited to the syllabus', 'Ask a doubt about any topic', 'Add subjects to a course from here'],
  },
  {
    route: 'qbank',
    target: 'qbank',
    eyebrow: 'Step 4',
    title: 'Syllabus Bank',
    body: 'Each subject links to its official syllabus and lists the real past-paper questions in the library, grouped by topic. Practise a topic straight from here.',
    bullets: ['Official syllabus per subject', 'Past-paper questions by topic', 'Reveal answers, search, practise'],
  },
  {
    route: 'worksheets',
    target: 'worksheets',
    eyebrow: 'Step 5',
    title: 'Build a worksheet',
    body: 'Pick subject, topics, answer type, difficulty and duration. AI writes original in-syllabus questions; tick past papers to mix in real ones. Exam mode locks the screen; Pace coach budgets your time per question.',
    bullets: ['Adaptive difficulty and full exam simulations', 'Rate your confidence, tag why you missed a question, get the worked solution', 'Missed questions come back as spaced reviews'],
  },
  {
    route: 'history',
    target: 'history',
    eyebrow: 'Step 6',
    title: 'Worksheet History',
    body: 'Every sheet you finish, with its score, AI diagnosis and a "How you worked" analysis: time per question, revisits, changed answers and what it says about your technique.',
    bullets: ['Resume an unfinished sheet', 'Time-per-question graph', 'Mistake history lives here too'],
  },
  {
    route: 'progress',
    target: 'progress',
    eyebrow: 'Step 7',
    title: 'Performance',
    body: 'Score trend per subject with the predicted grade in your board’s format. Click a subject to see it alone. Timing trends show which topics slow you down and whether speed costs accuracy.',
    bullets: ['Predicted grade per subject', 'Pace vs accuracy', 'Improvement over time'],
  },
  {
    route: 'strengths',
    target: 'strengths',
    eyebrow: 'Step 8',
    title: 'Strengths & Weaknesses',
    body: 'Topics sorted by accuracy with adaptive thresholds you can customise. Weak topics feed the recommendations and the "Study next" chips on your dashboard.',
    bullets: ['Filter by subject', 'Adaptive or custom thresholds', 'Weakest topics first'],
  },
  {
    route: 'recommendations',
    target: 'recommendations',
    eyebrow: 'Step 9',
    title: 'Smart Learning',
    body: 'Your AI study coach knows your boards, exam dates, weak topics and every diagnosis. Below it: all worksheet diagnoses and your next best actions.',
    bullets: ['A 7-day AI study plan you tick off', 'Re-run any diagnosis', 'Next best actions by weakest topic'],
  },
  {
    route: 'flashcards',
    target: 'flashcards',
    eyebrow: 'Step 10',
    title: 'Flashcards',
    body: 'Every missed question becomes a card. Flip it, rate how well you knew it, and it comes back just before you would forget. Badges on the dashboard track goals like streaks and perfect sheets.',
    bullets: ['Again / Hard / Good / Easy', 'Filter by subject', 'Only what is due today'],
  },
  {
    route: 'groups',
    target: 'groups',
    eyebrow: 'Step 11',
    title: 'Study Groups',
    body: 'Create a group for your class and share the 8-character code. The weekly leaderboard shows first names, questions answered, accuracy and streak — never answers or emails.',
    bullets: ['Join with a code', 'Weekly leaderboard', 'Share a read-only progress link with a teacher from Settings'],
  },
  {
    route: 'settings',
    target: 'settings',
    eyebrow: 'Step 12',
    title: 'Settings',
    body: 'Goals, difficulty, keyboard shortcuts, light or dark mode, daily reminders, the weekly email digest, share links for a teacher or parent, and one switch that turns every AI assistant off.',
    bullets: ['Reminders and weekly digest', 'Share progress read-only', 'AI on / off, theme and shortcuts'],
  },
];

export default function TutorialOverlay() {
  const { finishTutorial, state } = useApp();
  const [i, setI] = useState(0);
  const wrapRef = useRef(null);
  // The course-overview step is meaningless before a course exists (it would
  // show "No course found"), so a fresh account starts at "Add your courses".
  // Decided once when the tour opens: if it reacted to courses changing, adding
  // a course mid-tour would insert a step and yank the student to another page.
  const [steps] = useState(() => ((state.courses || []).length ? STEPS : STEPS.filter((s) => s.route !== 'course-overview')));
  const step = steps[i];
  const isLast = i === steps.length - 1;

  // Navigate to the step's route when step changes
  useEffect(() => {
    if (step?.route) window.location.hash = `#${step.route}`;
  }, [i, step]);

  // Pulse-highlight the corresponding sidebar nav item
  useEffect(() => {
    const els = document.querySelectorAll('[data-nav-key]');
    els.forEach((el) => el.classList.remove('tut-highlight'));
    if (!step?.target) return;
    const active = document.querySelector(`[data-nav-key="${step.target}"]`);
    if (active) active.classList.add('tut-highlight');
    return () => { if (active) active.classList.remove('tut-highlight'); };
  }, [step]);

  // Position the floating tooltip near the highlighted sidebar item
  const [pos, setPos] = useState({ top: 120, left: 250 });
  useEffect(() => {
    const compute = () => {
      const target = document.querySelector(`[data-nav-key="${step.target}"]`);
      if (!target) return;
      const r = target.getBoundingClientRect();
      const top = Math.max(20, Math.min(window.innerHeight - 340, r.top - 20));
      const left = Math.min(window.innerWidth - 420, r.right + 18);
      setPos({ top, left });
    };
    compute();
    const id = setTimeout(compute, 30);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [step]);

  const close = () => finishTutorial();
  const next = () => isLast ? close() : setI((v) => v + 1);
  const back = () => setI((v) => Math.max(0, v - 1));

  return (
    <>
      {/* very light backdrop, click-through where possible */}
      <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px]" />
      </div>

      {/* arrow + tooltip */}
      <div ref={wrapRef} className="fixed z-50 w-[400px] max-w-[92vw] animate-tut-in" style={{ top: pos.top, left: pos.left }}>
        <div className="relative">
          {/* arrow pointing left toward sidebar */}
          <span className="hidden md:block absolute -left-2.5 top-7 w-6 h-6 rotate-45 bg-white border-l border-b border-[color:var(--color-border)]" />
          <div className="relative bg-white border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
            <div className="h-1 w-full bg-slate-100">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-blue-600">{step.eyebrow}</div>
                  <div className="text-[18px] font-semibold tracking-tight text-slate-900 mt-1">{step.title}</div>
                </div>
                <button onClick={close} className="w-7 h-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors" aria-label="Close tutorial">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">{step.body}</p>
              <ul className="mt-3 flex flex-col gap-1">
                {step.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px] text-slate-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-5 py-3 border-t border-[color:var(--color-border)] flex items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, idx) => (
                  <button key={s.title} onClick={() => setI(idx)} aria-label={`Go to step ${idx + 1}`}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === i ? 'bg-blue-600' : (idx < i ? 'bg-blue-300' : 'bg-slate-300')}`} />
                ))}
                <span className="ml-2 text-[11.5px] text-slate-500 tabular-nums">{i + 1} / {steps.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={close} className="text-[12.5px] text-slate-500 hover:text-slate-800 transition-colors">Skip</button>
                {i > 0 && (
                  <button onClick={back} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12.5px] border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                {!isLast ? (
                  <button onClick={next} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={next} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12.5px] font-medium bg-blue-600 text-white hover:opacity-95 transition-opacity">
                    <Sparkles className="w-4 h-4" /> Finish tour
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
