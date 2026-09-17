import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, BadgeCheck, Info, ArrowLeft, Sun, Moon, Search, Check, Database } from 'lucide-react';
import { RESOURCE_TRACKS } from '../../data/resources';
import { SUBJECTS, QUESTION_BANK } from '../../data/mock';
import { topicsFor } from '../../lib/subjects';
import { useApp } from '../../context/AppContext';
import Footer from './Footer';
import Reveal from './Reveal';
import { DoodleBooks, DoodleFlask } from '../decor/StudyDoodles';

/* Count the questions actually stored for a course: every topic of every
   subject on the track, summed over the built-in question bank. */
function questionCount(trackId) {
  const subjects = SUBJECTS[trackId] || [];
  let n = 0;
  subjects.forEach((sub) => {
    topicsFor(trackId, sub).forEach((t) => { n += (QUESTION_BANK[t] || []).length; });
  });
  return n;
}

const COURSE_FEATURES = [
  'Exam-accurate diagnosis of weak topics',
  'Course overview for revision',
  'Fresh exam-style questions, unlimited',
  'Accurate scores & predicted grades',
  'Official past-paper & syllabus links',
];

function parseTrackFromHash() {
  const q = (window.location.hash.split('?')[1] || '');
  const m = new URLSearchParams(q).get('track');
  return RESOURCE_TRACKS.some((t) => t.id === m) ? m : null;
}

export default function ResourcesPage() {
  const { toggleTheme, state } = useApp();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(() => parseTrackFromHash());

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    const onHash = () => setActive(parseTrackFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESOURCE_TRACKS;
    return RESOURCE_TRACKS.filter((t) => {
      if (t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q)) return true;
      return (SUBJECTS[t.id] || []).some((s) => s.toLowerCase().includes(q));
    });
  }, [query]);

  const track = active ? RESOURCE_TRACKS.find((t) => t.id === active) : null;
  const openCourse = (id) => { window.location.hash = `#resources?track=${id}`; };
  const closeCourse = () => { window.location.hash = '#resources'; };

  return (
    <div className="section-bg min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 liquid-glass border-b border-[color:var(--color-border)]">
        <div className="max-w-[1280px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2 text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to InfinitySheets
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {state.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a href="#signup" className="btn-violet px-4 py-2 rounded-lg text-[14px] font-medium shadow-sm">Start Free</a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-24">
          {!track && (
            <>
              <Reveal>
                <div className="relative max-w-[820px]">
                  <div className="hidden lg:block absolute -right-40 top-0"><DoodleBooks /></div>
                  <div className="eyebrow mb-5">Course directory</div>
                  <h1 className="h-display text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.05]">
                    Find your course.
                  </h1>
                  <p className="mt-6 text-[16.5px] text-slate-600 leading-relaxed max-w-[640px]">
                    Search by course or subject to see what InfinitySheets offers for it&mdash;questions
                    stored, diagnosis tools, and every official past paper and syllabus source, free.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="mt-10 max-w-[560px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your course or subject — e.g. AP, IGCSE, Physics…"
                    className="w-full liquid-glass rounded-2xl pl-12 pr-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-400/60"
                    data-testid="course-search"
                  />
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                {results.map((t, i) => (
                  <Reveal key={t.id} delay={(i % 3) * 0.06} y={16}>
                    <button
                      type="button"
                      onClick={() => openCourse(t.id)}
                      data-testid={`course-card-${t.id}`}
                      className="w-full text-left liquid-glass rounded-2xl p-6 hover-lift"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-[18px] font-semibold text-slate-900">{t.name}</h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold">
                          <Database className="w-3.5 h-3.5" /> {questionCount(t.id)}+ questions
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
                        {(SUBJECTS[t.id] || []).join(' · ') || 'Subject list coming soon'}
                      </p>
                      <div className="text-[12.5px] text-blue-600 font-medium mt-3">View course &rarr;</div>
                    </button>
                  </Reveal>
                ))}
                {results.length === 0 && (
                  <div className="col-span-full liquid-glass rounded-2xl p-8 text-center">
                    <p className="text-[15px] text-slate-600">No course matches &ldquo;{query}&rdquo; yet.</p>
                    <p className="text-[13px] text-slate-400 mt-1">We add new curricula regularly — tell us what you need after signing up.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {track && (
            <div>
              <button onClick={closeCourse} className="inline-flex items-center gap-1.5 text-[13.5px] text-slate-500 hover:text-slate-900 transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" /> All courses
              </button>
              <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
                <div>
                  <div className="hidden lg:block absolute right-0 -top-8"><DoodleFlask width={80} /></div>
                  <h1 className="h-display text-[40px] sm:text-[50px] lg:text-[58px] leading-[1.05]">{track.name}</h1>
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[14px] font-semibold">
                    <Database className="w-4 h-4" /> {questionCount(track.id)}+ questions stored, plus unlimited generated ones
                  </div>
                  <ul className="mt-6 flex flex-col gap-2.5" data-testid="course-features">
                    {COURSE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </span>
                        <span className="text-[15px] text-slate-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {(SUBJECTS[track.id] || []).length > 0 && (
                    <div className="mt-7">
                      <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-400 mb-2.5">Subjects covered</div>
                      <div className="flex flex-wrap gap-2">
                        {(SUBJECTS[track.id] || []).map((s) => (
                          <span key={s} className="px-3 py-1.5 rounded-full liquid-glass text-[13px] text-slate-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <a href="#signup" className="btn-violet inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl text-[15px] font-medium">
                    Start practicing {track.short} free
                  </a>
                </div>
                <div className="liquid-glass rounded-3xl p-6">
                  <div className="text-[12px] tracking-wider uppercase font-semibold text-slate-500 mb-1">Free official sources</div>
                  <p className="text-[12.5px] text-slate-400 mb-5">We link to the original publishers rather than re-hosting their papers.</p>
                  {track.note && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-[13px] text-amber-800 leading-relaxed">{track.note}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-6">
                    {track.groups.map((g) => (
                      <div key={g.label}>
                        <div className="flex items-center gap-2 mb-2.5">
                          {/official|KSEAB|Pareeksha|DGE|NTA|College Board|LSAC|IIT/i.test(g.label) && <BadgeCheck className="w-4 h-4 text-emerald-600" />}
                          <h3 className="text-[12px] tracking-[0.1em] uppercase font-semibold text-slate-500">{g.label}</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                          {g.links.map((l) => (
                            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                              className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 hover:border-blue-300 transition-colors">
                              <span>
                                <span className="block text-[13.5px] font-medium text-slate-800 leading-snug">{l.title}</span>
                                <span className="block text-[12px] text-slate-500 leading-snug">{l.desc}</span>
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 mt-1 shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
