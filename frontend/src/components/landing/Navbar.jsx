import React, { useState } from 'react';
import { Infinity, Menu, X, Sun, Moon, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar({ onStart }) {
  const [open, setOpen] = useState(false);
  // Past the hero, Start Free becomes the loudest element in the bar.
  const [scrolled, setScrolled] = useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const { toggleTheme, state } = useApp();
  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Courses', href: '#resources' },
    { label: 'Pricing', href: '#pricing' },
  ];
  return (
    <header className="sticky top-0 z-40 liquid-glass border-b border-[color:var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 h-[60px] flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Infinity className="w-5 h-5 text-white" strokeWidth={2.6} />
          </span>
          <span className="font-semibold text-[15px] tracking-tight text-slate-900">InfinitySheets</span>
        </a>
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] text-slate-600 hover:text-slate-900 transition-colors">{l.label}</a>
          ))}
          <a href="#login" className="text-[14px] font-medium text-slate-900">Log In</a>
          <a href="#signup" className="text-[14px] font-medium text-slate-900">Sign Up</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {state.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {state.user ? (
            <button onClick={() => { window.location.hash = '#dashboard'; }} data-testid="nav-open-app" className={`btn-violet hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-300 ${scrolled ? 'shadow-lg shadow-violet-400/40 ring-2 ring-violet-300/60 scale-105' : 'shadow-sm'}`}>
              Open app <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onStart} className={`btn-violet hidden lg:inline-flex px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-300 ${scrolled ? 'shadow-lg shadow-violet-400/40 ring-2 ring-violet-300/60 scale-105' : 'shadow-sm'}`}>Start Free</button>
          )}
          <button onClick={() => setOpen(!open)} aria-label="Open menu" className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-md hover:bg-slate-100">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-[14px] text-slate-700">{l.label}</a>
            ))}
            <a href="#login" onClick={() => setOpen(false)} className="text-[14px] font-medium">Log In</a>
            <a href="#signup" onClick={() => setOpen(false)} className="text-[14px] font-medium">Sign Up</a>
            {state.user ? (
              <button onClick={() => { setOpen(false); window.location.hash = '#dashboard'; }} className="btn-violet px-4 py-2 rounded-lg text-[14px] font-medium">Open app</button>
            ) : (
              <button onClick={() => { setOpen(false); onStart(); }} className="btn-violet px-4 py-2 rounded-lg text-[14px] font-medium">Start Free</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
