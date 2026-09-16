import React from 'react';
import { ArrowLeft, Infinity } from 'lucide-react';

/*
 * Simple privacy policy reachable at #privacy — backs the waitlist's
 * "we'll never share your email" promise and gives ad networks a policy
 * URL when ads fund the free product later.
 */
const SECTIONS = [
  {
    h: 'What we collect',
    p: 'If you join the waitlist, we store the email address you give us. If you create an account, we store your name, email, chosen exam track, and your study data (worksheets, scores, streaks, and settings) so the product can work. The free demo stores its data only on your own device.',
  },
  {
    h: 'What we never do',
    p: 'We never sell your personal information, and we never share your email address with anyone for marketing. Waitlist emails are used for exactly one thing: telling you about the InfinitySheets launch.',
  },
  {
    h: 'AI helpers (Google Gemini)',
    p: 'Several features — original practice questions, marking against a scheme, worked solutions, the study coach and topic overviews — are powered by Google Gemini. While the AI is switched on, the questions you answer, your typed answers and any photos of working you upload are sent to Google to produce those answers. We never send your name, email address or account identifiers, the requests are made through our own server (your device never talks to Google directly), and under the API terms we use Google does not use this data to train its models. You can switch every AI feature off in Settings → Privacy & your data, and nothing is sent while it is off.',
  },
  {
    h: 'Children',
    p: 'InfinitySheets is built for school students. When you first use the app we ask for your age band. If you are under 13, the AI helpers stay off unless a parent or guardian confirms they are OK with it, and study groups only ever show first names. Parents can ask us to see or delete a child\'s data at any time using the address on the landing page.',
  },
  {
    h: 'Study groups',
    p: 'If you join a study group, other members see your first name, how many worksheets and questions you did this week and your streak — never your answers, scores or email. Groups have no rankings.',
  },
  {
    h: 'Ads',
    p: 'InfinitySheets is free and may be supported by ads. Ad providers may use cookies or similar technologies subject to their own policies; we will keep this page updated with the specific providers before any ads go live.',
  },
  {
    h: 'Cookies & sessions',
    p: 'Signed-in sessions use secure httpOnly cookies for authentication only. We do not use tracking cookies of our own. If product analytics are enabled we record which features are used under a hashed account id, never your name or email, and you can download or delete everything from Settings.',
  },
  {
    h: 'Your choices',
    p: 'You can ask us to remove your waitlist email or delete your account and its data at any time — write to us and we will do it. Account deletion from Settings removes your study data immediately.',
  },
  {
    h: 'Changes',
    p: 'If this policy changes in a way that matters, we will say so plainly on this page with the date of the change.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="section-bg min-h-screen">
      <header className="sticky top-0 z-40 liquid-glass border-b border-[color:var(--color-border)]">
        <div className="max-w-[860px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2" onClick={() => { window.location.hash = ''; }}>
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Infinity className="w-5 h-5 text-white" strokeWidth={2.6} />
            </span>
            <span className="font-semibold text-[15px] tracking-tight text-slate-900">InfinitySheets</span>
          </a>
          <a href="#top" className="inline-flex items-center gap-1.5 text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to InfinitySheets
          </a>
        </div>
      </header>
      <main className="max-w-[860px] mx-auto px-6 py-16">
        <h1 className="h-display text-[36px] sm:text-[44px] text-slate-900">Privacy policy</h1>
        <p className="mt-3 text-[14px] text-slate-500">Last updated: July 2026 &middot; The short version: your email is for the launch, your data is yours, and nothing gets sold.</p>
        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-[18px] font-semibold text-slate-900">{s.h}</h2>
              <p className="mt-2 text-[14.5px] text-slate-600 leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
