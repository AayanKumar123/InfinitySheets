import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { enrolledSubjects, boardFor, resolvedTopics } from '../../lib/subjects';
import { track } from '../../lib/analytics';

// Ctrl/⌘ K: jump anywhere — pages, subjects, topics (opens the topic
// overview), or start a worksheet on a topic straight away.
export default function CommandPalette({ nav = [], go, open, onClose }) {
  const { state, toggleTheme } = useApp();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const subjects = useMemo(() => enrolledSubjects(state.courses, state.user?.subjects, state.user?.examTrack), [state.courses, state.user?.subjects, state.user?.examTrack]);

  const items = useMemo(() => {
    const list = [];
    nav.forEach((n) => list.push({ kind: 'Page', label: n.label, run: () => go(n.key) }));
    list.push({ kind: 'Page', label: 'Create a worksheet', run: () => go('worksheets') });
    list.push({ kind: 'Page', label: 'Mistake history', run: () => go('mistakes') });
    list.push({ kind: 'Action', label: `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} mode`, run: toggleTheme });
    subjects.forEach((s) => {
      list.push({ kind: 'Subject', label: s, hint: 'Start studying', run: () => go(`study?subject=${encodeURIComponent(s)}`) });
      resolvedTopics(state.syllabusTopics, boardFor(s, state.courses, state.user?.examTrack), s).forEach((t) => {
        list.push({ kind: 'Topic', label: t, hint: s, run: () => go(`topic?subject=${encodeURIComponent(s)}&topic=${encodeURIComponent(t)}`) });
        list.push({ kind: 'Practise', label: `Worksheet on ${t}`, hint: s, run: () => { try { sessionStorage.setItem('preselect_subject', s); sessionStorage.setItem('preselect_topic', t); } catch (e) { /* ignore */ } go('worksheets'); } });
      });
    });
    return list;
  }, [nav, subjects, state.theme, state.courses, state.syllabusTopics, state.user?.examTrack, go, toggleTheme]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.filter((i) => i.kind === 'Page' || i.kind === 'Subject').slice(0, 12);
    const words = s.split(/\s+/);
    return items.map((i) => {
      const hay = `${i.label} ${i.hint || ''} ${i.kind}`.toLowerCase();
      const score = words.every((w) => hay.includes(w)) ? (i.label.toLowerCase().startsWith(s) ? 3 : hay.startsWith(s) ? 2 : 1) : 0;
      return { i, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.i);
  }, [items, q]);

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;
  const pick = (item) => { if (!item) return; track('palette_used', { kind: item.kind }); onClose(); item.run(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((v) => Math.min(results.length - 1, v + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((v) => Math.max(0, v - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[idx]); }
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4" onClick={onClose} data-testid="palette">
      <div className="w-full max-w-[560px] rounded-2xl bg-white border border-[color:var(--color-border)] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-[color:var(--color-border)]">
          <Search className="w-4 h-4 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Go to a page, subject or topic… (try “quadratic”)" className="flex-1 py-3 bg-transparent outline-none text-[14px] text-slate-900 placeholder:text-slate-400" data-testid="palette-input" />
          <kbd className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-auto py-1.5" data-testid="palette-results">
          {results.length === 0 && <li className="px-4 py-3 text-[13px] text-slate-500">Nothing matches.</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}-${r.label}-${r.hint || ''}`}>
              <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => pick(r)} className={`w-full text-left px-4 py-2 flex items-center gap-3 text-[13.5px] ${i === idx ? 'bg-violet-50 text-violet-900' : 'text-slate-800 hover:bg-slate-50'}`}>
                <span className="text-[10.5px] uppercase tracking-wide w-16 shrink-0 text-slate-400">{r.kind}</span>
                <span className="flex-1 min-w-0 truncate">{r.label}{r.hint && <span className="text-slate-400"> · {r.hint}</span>}</span>
                {i === idx && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
