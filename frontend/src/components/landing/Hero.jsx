import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import InfinityBackground from '../decor/InfinityBackground';
import { DoodleBooks, DoodleFlask, DoodleEquations } from '../decor/StudyDoodles';
import Emphasis from './Emphasis';
import WatchVideoModal from './WatchVideoModal';
import FeatureCarousel from './FeatureCarousel';
import { EXAM_TRACKS } from '../../data/mock';

/* Static heading; the word "you" gets swept with a marker highlight
   shortly after load — study vibes, no typing. */
function HeroHeading() {
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHighlight(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <h1 className="h-display text-[56px] sm:text-[80px] lg:text-[108px] leading-[1.02] max-w-[1080px]">
      A study tool tailored just for{' '}
      <span className={`hl-mark hl-serif ${highlight ? 'hl-on' : ''}`}>you</span>.
    </h1>
  );
}

export default function Hero() {
  const [videoOpen, setVideoOpen] = useState(false);
  return (
    <section id="top" className="relative section-bg overflow-hidden">
      <WatchVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
      <InfinityBackground variant="hero" />
      <div className="absolute inset-0 grid-fade pointer-events-none" />
      <div className="hidden xl:block absolute left-[4%] top-[26%] opacity-90 pointer-events-none"><DoodleBooks /></div>
      <div className="hidden xl:block absolute left-[7%] top-[62%] opacity-80 pointer-events-none"><DoodleEquations width={130} /></div>
      <div className="hidden xl:block absolute right-[5%] top-[28%] opacity-90 pointer-events-none"><DoodleFlask /></div>
      <div className="relative max-w-[1280px] mx-auto px-6 min-h-[92svh] flex flex-col items-center justify-center text-center pt-20 pb-10">
        <HeroHeading />
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-[18px] sm:text-[20px] text-slate-500 max-w-[680px] leading-relaxed"
        >
          Coaching centres win exams with endless on-syllabus practice, focused work on weak
          concepts, and total exam familiarity. InfinitySheets puts that training on any
          device&mdash;<Emphasis variant="highlight" className="text-slate-800 font-medium">completely free</Emphasis>.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <a href="#signup" className="btn-violet inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[17px] font-semibold shadow-lg shadow-violet-300/40">
            Start Free <ArrowRight className="w-5 h-5" />
          </a>
          {/* Secondary: the product walkthrough — the only visual proof on the page */}
          <button onClick={() => setVideoOpen(true)} className="btn-outline-dark inline-flex items-center gap-2 px-6 py-4 rounded-xl text-[16px] font-medium">
            <Play className="w-5 h-5 text-red-600" /> Watch video
          </button>
        </motion.div>
        <motion.a
          href="#try"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.28 }}
          className="mt-5 text-[14px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          or try a real exam question right now &darr;
        </motion.a>
        <FeatureCarousel />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-12 flex flex-wrap lg:flex-nowrap items-center justify-center gap-3"
        >
          {EXAM_TRACKS.map((t) => (
            <a
              key={t.id}
              href={`#resources?track=${t.id}`}
              className="whitespace-nowrap px-5 py-2.5 rounded-full border border-slate-300 bg-white text-[15px] font-semibold text-slate-800 shadow-md shadow-slate-900/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-500 hover:text-blue-700 transition-all duration-200"
            >
              {t.name}
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
