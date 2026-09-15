import React, { useMemo, useState } from 'react';
import { Award, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BADGES, computeBadges, nextBadge } from '../../lib/badges';

// Goals & badges card: what is unlocked, what is next, and the full list on
// demand. Everything is derived from state (lib/badges.js).
export default function Badges({ compact = false }) {
  const { state } = useApp();
  const unlocked = useMemo(() => computeBadges(state), [state]);
  const next = useMemo(() => nextBadge(state, unlocked), [state, unlocked]);
  const [open, setOpen] = useState(!compact);
  const count = Object.keys(unlocked).length;
  const stamps = state.badges || {};

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="badges">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow-muted mb-0.5">Goals &amp; badges</div>
          <div className="text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> {count} of {BADGES.length} unlocked</div>
        </div>
        {compact && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12.5px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1" data-testid="badges-toggle">
            {open ? 'Hide' : 'Show all'} <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {BADGES.filter((b) => unlocked[b.id]).map((b) => (
          <span key={b.id} title={`${b.how}${stamps[b.id] ? ` · ${new Date(stamps[b.id]).toLocaleDateString()}` : ''}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-900 text-[12px] font-medium" data-testid={`badge-${b.id}`}>
            <span>{b.emoji}</span> {b.name}
          </span>
        ))}
        {count === 0 && <span className="text-[12.5px] text-slate-500">Finish a worksheet to earn your first badge.</span>}
      </div>
      {next && (
        <div className="mt-3 rounded-xl border border-[color:var(--color-border)] bg-slate-50/60 px-3 py-2.5" data-testid="badge-next">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Next up</div>
          <div className="text-[13px] text-slate-800"><span className="mr-1">{next.emoji}</span><span className="font-semibold">{next.name}</span> · {next.how}</div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1.5"><div className="h-full bg-amber-400" style={{ width: `${Math.round(next.progress * 100)}%` }} /></div>
        </div>
      )}
      {open && (
        <div className="grid sm:grid-cols-2 gap-1.5 mt-3">
          {BADGES.map((b) => (
            <div key={b.id} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] ${unlocked[b.id] ? 'text-slate-800' : 'text-slate-400'}`}>
              <span className={`text-[16px] ${unlocked[b.id] ? '' : 'grayscale opacity-60'}`}>{b.emoji}</span>
              <span><span className="font-medium">{b.name}</span> <span className="text-slate-500">· {b.how}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
