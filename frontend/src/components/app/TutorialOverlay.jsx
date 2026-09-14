import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    body: 'Here are all the topics we\u2019ll help you master, along with a quick summary of what each one covers. Come back anytime from My Courses.',
    bullets: ['Every topic, per subject', 'Brief summary per topic', 'Jump into any subject'],
  },
  {
    route: 'courses',
    target: 'courses',
    eyebrow: 'Step 1',
    title: 'Add your courses',
    body: 'List every course you are studying. We tailor your recommendations and worksheets to these.',
    bullets: ['Add multiple courses', 'Set a target grade', 'Mark status: active or completed'],
  },
  {
    route: 'study',
    target: 'study',
    eyebrow: 'Step 2',
    title: 'Browse subjects',
    body: 'Click any subject card to see its overview—topics, key focus areas, your accuracy, and study tips.',
    bullets: ['Per-subject overview', 'Click a topic to drill in', 'Create worksheet from any subject'],
  },
  {
    route: 'worksheets',
    target: 'worksheets',
    eyebrow: 'Step 3',
    title: 'Build a worksheet',
    body: 'Pick subject, topic, difficulty, and length. We generate an interactive worksheet instantly.',
    bullets: ['Multiple choice or typed', 'Timed or untimed', '5, 10, or 15 questions'],
  },
  {
    route: 'mistakes',
    target: 'mistakes',
    eyebrow: 'Step 4',
    title: 'Review mistakes',
    body: 'Every question you miss lands here so you can retry and lock it in.',
    bullets: ['Auto-collected', 'Reveal correct answers', 'Mark as reviewed'],
  },
  {
    route: 'progress',
    target: 'progress',
    eyebrow: 'Step 5',
    title: 'Track progress',
    body: 'A score-over-time chart plus average, best, and total practice stats.',
    bullets: ['Score over time', 'Average and best', 'All worksheet data'],
  },
];

export default function TutorialOverlay() {
  const { finishTutorial, state } = useApp();
  const [i, setI] = useState(0);
  const wrapRef = useRef(null);
  // The course-overview step is meaningless before a course exists (it would
  // show "No course found"), so a fresh account starts at "Add your courses".
  const steps = useMemo(() => ((state.courses || []).length ? STEPS : STEPS.filter((s) => s.route !== 'course-overview')), [state.courses]);
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
