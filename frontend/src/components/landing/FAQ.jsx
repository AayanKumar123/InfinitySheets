import React, { useState } from 'react';
import { Plus, Minus, ChevronDown, MessageCircleQuestion } from 'lucide-react';
import Reveal from './Reveal';
import TypeHeading from './TypeHeading';
import { DoodleGradCap, DoodleBooks } from '../decor/StudyDoodles';

const FAQS = [
  {
    q: 'Is it really free?',
    a: 'Yes. Every feature—worksheets, weakness analysis, scores, predicted grades—is free, supported by ads so it stays that way for everyone.',
  },
  {
    q: 'How is this different from ChatGPT?',
    a: 'A chatbot answers what you ask, forgets you between sessions, and drifts off syllabus. InfinitySheets remembers every answer you give, tracks your weaknesses over time, matches real exam formats, and decides what you should practice next—so the burden of knowing what to study never falls back on you.',
  },
  {
    q: 'Are the questions like real past papers?',
    a: 'That is the goal of every question we generate. AI is used for one job—creating fresh, exam-style questions—and we continuously compare the output against real past papers for style, format, and difficulty. If a question ever feels off, you can flag it and we improve.',
  },
  {
    q: 'Which exams are covered?',
    a: 'AP, AS & A Level, CBSE (Class 10 and 12), IB, ICSE, ISC, IGCSE, JEE, LSAT, NEET, and SAT—each with subject-specific question banks. This especially helps courses like AP or IB, where practice material is usually locked behind paywalls.',
  },
  {
    q: 'How accurate are the predicted grades?',
    a: 'Predictions are built from your worksheet scores across topics and calibrated against how each exam is graded. They sharpen as you practice more—and the point is not just to know the number, but to change it while there is still time.',
  },
  {
    q: 'Who is behind InfinitySheets?',
    a: 'Students. We built this because we are preparing for the same exams you are, and we think the training coaching centres sell should not be a privilege only for those who can afford it.',
  },
];

// Revealed by the "View more questions" button.
const MORE_FAQS = [
  {
    q: 'Does it work on my phone?',
    a: 'Yes — the whole site and app are built mobile-first, so you can practice on the bus, between classes, or wherever you study. Progress syncs to your account.',
  },
  {
    q: 'Can I prepare for more than one exam at once?',
    a: 'Absolutely. Add as many courses as you like — each gets its own subjects, exam dates, worksheets, and predicted grades, and the dashboard keeps them all in view.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your worksheets and progress belong to you. We store only what the app needs to work, we never sell personal data, and you can delete your account (and everything with it) from Settings at any time.',
  },
  {
    q: 'I found a wrong or unrealistic question — what do I do?',
    a: 'Tell us! Question quality is the thing we care about most. Flag it in the app or reach out directly, and we will fix it and use it to improve generation for everyone.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  const [showMore, setShowMore] = useState(false);
  return (
    <section id="faq" className="section-bg">
      <div className="max-w-[1280px] mx-auto px-6 py-28 lg:py-32">
        <Reveal>
          <div className="relative text-center max-w-[720px] mx-auto">
            <TypeHeading text="Everything students ask us." className="h-display text-[46px] sm:text-[58px] lg:text-[64px] leading-[1.05]" />
            <div className="hidden lg:block absolute -right-40 -top-4"><DoodleGradCap /></div>
            <div className="hidden lg:block absolute -left-44 top-10"><DoodleBooks width={95} /></div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-14 max-w-[760px] mx-auto flex flex-col gap-3">
            {(showMore ? [...FAQS, ...MORE_FAQS] : FAQS).map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="rounded-2xl liquid-glass overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[15.5px] font-semibold text-slate-900">{f.q}</span>
                    {isOpen ? <Minus className="w-4 h-4 shrink-0 text-slate-400" /> : <Plus className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <p className="px-6 pb-5 text-[14.5px] text-slate-600 leading-relaxed">{f.a}</p>
                  )}
                </div>
              );
            })}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {!showMore && (
                <button
                  onClick={() => setShowMore(true)}
                  data-testid="faq-view-more"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" /> View more questions
                </button>
              )}
              <a
                href="mailto:hello@infinitysheets.app?subject=Question%20about%20InfinitySheets"
                data-testid="faq-ask"
                className="btn-violet inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium"
              >
                <MessageCircleQuestion className="w-4 h-4" /> Ask a question
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
