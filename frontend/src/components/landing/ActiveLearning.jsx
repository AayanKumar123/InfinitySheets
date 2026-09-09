import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Brain, Clock, TrendingUp } from 'lucide-react';
import Reveal from './Reveal';
import Emphasis from './Emphasis';

// Three study styles, compared on three measures. Each measure is its own
// small chart with its own scale (hours and percentages never share an axis).
const SERIES = [
  { key: 'active', label: 'Active learning', sub: 'practice, retrieval, self-testing', cls: 'viz-s1' },
  { key: 'passive', label: 'Passive learning', sub: 'reading, highlighting, rereading', cls: 'viz-s2' },
  { key: 'none', label: 'No structured study', sub: 'minimal or none', cls: 'viz-s3' },
];

const MEASURES = [
  { title: 'Study time per week', unit: 'hrs', values: { active: 6.7, passive: 4.1, none: 2.3 }, fmt: (v) => `${v} hrs` },
  { title: 'Average grade', unit: '%', values: { active: 78, passive: 62, none: 45 }, fmt: (v) => `${v}%` },
  { title: 'Improvement vs start of term', unit: 'pts', values: { active: 23, passive: 8, none: -5 }, fmt: (v) => `${v > 0 ? '+' : ''}${v}%` },
];

const CALLOUTS = [
  { Icon: Brain, value: '2.6×', title: 'Higher average grade', body: 'Active learners score 2.6× higher on average than students with no structured study.' },
  { Icon: Clock, value: '1.6×', title: 'More effective time', body: 'They put in more hours—but in ways that actually move the grade, not just the clock.' },
  { Icon: TrendingUp, value: '3×', title: 'More improvement', body: 'Three times the gain over a term compared with passive rereading.' },
];

function SmallMultiple({ measure, inView, delay }) {
  const vals = SERIES.map((s) => measure.values[s.key]);
  const min = Math.min(0, ...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const baseline = ((0 - min) / span) * 100; // % from bottom

  return (
    <div className="viz-multiple">
      <div className="text-[13px] font-semibold text-slate-900 mb-3">{measure.title}</div>
      <div className="viz-plot" style={{ '--baseline': `${baseline}%` }}>
        {SERIES.map((s, i) => {
          const v = measure.values[s.key];
          const h = (Math.abs(v) / span) * 100;
          const neg = v < 0;
          return (
            <div key={s.key} className="viz-col" title={`${s.label}: ${measure.fmt(v)}`}>
              <span className={`viz-val ${neg ? 'viz-val-neg' : ''}`} style={{ [neg ? 'top' : 'bottom']: `calc(${neg ? 100 - baseline : baseline}% + ${inView ? h : 0}% + 6px)` }}>
                {measure.fmt(v)}
              </span>
              <div
                className={`viz-colbar ${s.cls} ${neg ? 'viz-colbar-neg' : ''}`}
                style={{
                  height: inView ? `${h}%` : '0%',
                  [neg ? 'top' : 'bottom']: `${neg ? 100 - baseline : baseline}%`,
                  transitionDelay: `${delay + i * 80}ms`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Charts() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref} className="viz-root">
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6" aria-label="Legend">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[13px] text-slate-700">
            <span className={`viz-swatch ${s.cls}`} aria-hidden="true" />
            <span><span className="font-semibold text-slate-900">{s.label}</span> <span className="text-slate-500">({s.sub})</span></span>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-6" role="img" aria-label="Active learning compared with passive and no structured study across study time, average grade and improvement">
        {MEASURES.map((m, i) => <SmallMultiple key={m.title} measure={m} inView={inView} delay={i * 120} />)}
      </div>
      <table className="sr-only">
        <caption>Study style compared</caption>
        <thead><tr><th>Measure</th>{SERIES.map((s) => <th key={s.key}>{s.label}</th>)}</tr></thead>
        <tbody>{MEASURES.map((m) => <tr key={m.title}><th scope="row">{m.title}</th>{SERIES.map((s) => <td key={s.key}>{m.fmt(m.values[s.key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function ActiveLearning() {
  return (
    <section className="section-light relative overflow-hidden" aria-labelledby="active-heading">
      <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <Reveal>
          <div className="max-w-[820px]">
            <h2 id="active-heading" className="h-display text-slate-900 text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.05]">
              Practice beats <Emphasis variant="highlight">rereading</Emphasis>. Every time.
            </h2>
            <p className="mt-6 text-[16.5px] sm:text-[18px] leading-relaxed text-slate-600 max-w-[680px]">
              Decades of learning research agree: testing yourself on material builds far stronger
              memory than reading it again. Students who practise and retrieve don&rsquo;t just study
              more efficiently&mdash;they finish the term with markedly higher grades.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-start">
          <Reveal delay={0.1} from="left">
            <div className="card-soft p-6 sm:p-8">
              <Charts />
              <p className="mt-6 text-[12px] text-slate-500">
                Indicative figures drawn from Dunlosky et al. (2013), Pashler et al. (2007) and Roediger &amp; Karpicke (2006).
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2} from="right">
            <div className="flex flex-col divide-y divide-[color:var(--color-border)]">
              {CALLOUTS.map(({ Icon, value, title, body }) => (
                <div key={title} className="py-6 first:pt-0 last:pb-0 flex gap-4">
                  <span className="shrink-0 w-11 h-11 rounded-full border border-violet-300 text-violet-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <div>
                    <div className="text-[34px] sm:text-[40px] font-semibold tracking-tight text-slate-900 leading-none">{value}</div>
                    <div className="mt-1.5 text-[15px] font-semibold text-slate-900">{title}</div>
                    <p className="mt-1 text-[14px] text-slate-600 leading-snug">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.25}>
          <p className="mt-14 text-[16px] sm:text-[17px] text-slate-700 max-w-[760px]">
            <span className="font-semibold text-slate-900">That loop is what InfinitySheets automates.</span> Every
            sheet is retrieval practice on your exact syllabus, marked instantly, tuned to where you are weak&mdash;so
            you learn smarter, not just longer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
