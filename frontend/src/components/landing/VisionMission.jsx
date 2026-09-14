import React from 'react';
import Reveal from './Reveal';
import Emphasis from './Emphasis';

// Vision & mission — a short, quiet statement of intent near the end of the
// landing page.
export default function VisionMission() {
  return (
    <section id="vision" className="relative section-light overflow-hidden">
      <div className="max-w-[1080px] mx-auto px-6 py-20 lg:py-24">
        <Reveal>
          <div className="text-[11px] tracking-[0.16em] uppercase font-semibold text-blue-600 mb-3">Why we build this</div>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          <Reveal delay={0.05}>
            <div className="h-full rounded-3xl liquid-glass border border-slate-200 px-7 py-8 sm:px-9 sm:py-10 shadow-lg shadow-slate-200/40" data-testid="vision">
              <div className="text-[13px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-3">Vision</div>
              <p className="h-display text-[26px] sm:text-[30px] leading-[1.2] text-slate-900">
                To enable every student to reach their{' '}
                <Emphasis variant="highlight" className="font-medium">full academic potential</Emphasis>.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="h-full rounded-3xl liquid-glass border border-slate-200 px-7 py-8 sm:px-9 sm:py-10 shadow-lg shadow-slate-200/40" data-testid="mission">
              <div className="text-[13px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-3">Mission</div>
              <p className="h-display text-[26px] sm:text-[30px] leading-[1.2] text-slate-900">
                To help students improve through personalized practice, targeted worksheets, and{' '}
                <Emphasis variant="underline" className="font-medium">meaningful guidance</Emphasis>.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
