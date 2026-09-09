import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import Reveal from './Reveal';
import Emphasis from './Emphasis';

// Share of students affected, one series, so one hue (see index.css --viz-*).
const BARS = [
  { label: 'Feel stressed or anxious about academics', value: 74 },
  { label: 'Spend 2+ hours a day studying but still struggle', value: 60 },
  { label: 'Are not confident in their core subjects', value: 45 },
  { label: 'Are not meeting grade expectations', value: 33 },
];

const CALLOUTS = [
  { value: '74%', lead: 'of students experience', strong: 'stress or anxiety', tail: 'related to academics.', source: 'Pew Research Center, 2023' },
  { value: '33%', lead: 'of students globally are', strong: 'not meeting minimum proficiency', tail: 'in maths.', source: 'UNESCO, 2023' },
  { value: '60%', lead: 'of students spend', strong: '2+ hours daily', tail: 'studying but still struggle to perform.', source: 'McKinsey, 2023' },
];

function BarChart() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} className="viz-root" role="img" aria-label="Share of students affected by each problem">
      <ul className="flex flex-col gap-5">
        {BARS.map((b, i) => (
          <li key={b.label} className="viz-row">
            <div className="text-[13.5px] text-slate-700 leading-snug mb-1.5">{b.label}</div>
            <div className="flex items-center gap-3">
              <div className="viz-track flex-1">
                <div
                  className="viz-bar"
                  style={{ width: inView ? `${b.value}%` : '0%', transitionDelay: `${i * 90}ms` }}
                  title={`${b.value}% — ${b.label}`}
                />
              </div>
              <span className="w-10 text-right text-[14px] font-semibold text-slate-900 tabular-nums">{b.value}%</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="viz-axis mt-4" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((t) => <span key={t}>{t}%</span>)}
      </div>
      <table className="sr-only">
        <caption>Share of students affected</caption>
        <tbody>{BARS.map((b) => <tr key={b.label}><th scope="row">{b.label}</th><td>{b.value}%</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function TheProblem() {
  return (
    <section className="section-bg relative overflow-hidden" aria-labelledby="problem-heading">
      <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <Reveal>
          <div className="max-w-[820px]">
            <h2 id="problem-heading" className="h-display text-slate-900 text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.05]">
              More resources than ever. <Emphasis variant="underline">Still stuck.</Emphasis>
            </h2>
            <p className="mt-6 text-[16.5px] sm:text-[18px] leading-relaxed text-slate-600 max-w-[680px]">
              Textbooks, videos, notes, tutors&mdash;students today have access to everything, yet most
              still fall short of what they are capable of. The hours go in. The marks don&rsquo;t come out.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-start">
          <Reveal delay={0.1} from="left">
            <div className="card-soft p-6 sm:p-8">
              <div className="text-[15px] font-semibold text-slate-900 mb-6">The student struggle is real</div>
              <BarChart />
              <p className="mt-5 text-[12px] text-slate-500">Share of students reporting each experience. Sources: Pew Research Center, McKinsey, UNESCO (2023).</p>
            </div>
          </Reveal>

          <Reveal delay={0.2} from="right">
            <div className="flex flex-col divide-y divide-[color:var(--color-border)]">
              {CALLOUTS.map((c) => (
                <div key={c.value + c.strong} className="py-6 first:pt-0 last:pb-0 pl-5 border-l-2 border-blue-600">
                  <div className="text-[44px] sm:text-[52px] font-semibold tracking-tight text-slate-900 leading-none">{c.value}</div>
                  <p className="mt-2 text-[15px] text-slate-600 leading-snug">
                    {c.lead} <span className="font-semibold text-blue-700">{c.strong}</span> {c.tail}
                  </p>
                  <div className="mt-1.5 text-[11.5px] text-slate-500">Source: {c.source}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.25}>
          <p className="mt-14 text-[16px] sm:text-[17px] text-slate-700 max-w-[760px]">
            <span className="font-semibold text-slate-900">InfinitySheets exists to change this.</span> Not
            more material to read&mdash;the right questions to answer, marked the moment you answer them.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
