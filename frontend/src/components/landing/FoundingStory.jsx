import React from 'react';
import Reveal from './Reveal';
import Emphasis from './Emphasis';
import { DoodleGradCap, DoodleEquations } from '../decor/StudyDoodles';

export default function FoundingStory() {
  return (
    <section id="story" className="relative section-light overflow-hidden">
      <div className="hidden lg:block absolute right-[4%] top-14"><DoodleGradCap /></div>
      <div className="hidden lg:block absolute left-[3%] bottom-12"><DoodleEquations width={130} /></div>
      <div className="max-w-[820px] mx-auto px-6 py-24 lg:py-28">
        <Reveal>
          <h2 className="h-display text-[38px] sm:text-[46px] lg:text-[54px] leading-[1.08]">
            Coaching centres don&rsquo;t win by teaching better. They win by treating the exam like a{' '}
            <Emphasis variant="highlight" className="text-slate-800 font-medium">tactical sport</Emphasis>.
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-8 flex flex-col gap-5 text-[16.5px] sm:text-[17.5px] text-slate-600 leading-relaxed">
            <p>
              Endless on-syllabus practice. Relentless drilling of weak points. Total familiarity with
              how questions are actually asked. That&rsquo;s what families pay thousands for&mdash;and it&rsquo;s
              why the students who can afford it walk into exams already knowing what&rsquo;s coming.
            </p>
            <p>
              We&rsquo;re students too, sitting the same exams. We didn&rsquo;t think that advantage should
              belong only to those who can pay for it. So we built the thing we wished existed:{' '}
              <Emphasis variant="underline" className="font-medium text-slate-800">the coaching-centre method, free, on every device</Emphasis>.
            </p>
            <p className="text-slate-500 text-[15px]">
              InfinitySheets is early, and we&rsquo;re building it in the open&mdash;so if something can be
              better, tell us. You&rsquo;re not just using it; you&rsquo;re shaping it.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl liquid-glass px-5 py-3">
            <span className="w-9 h-9 rounded-full bg-blue-600 text-white text-[13px] font-semibold flex items-center justify-center">IS</span>
            <span className="text-[14px] text-slate-600">Built by Aayan S. Kumar &amp; Angelo Jolwin</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
