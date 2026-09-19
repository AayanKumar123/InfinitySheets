import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { isPlus, PLUS_FEATURES } from '../../lib/entitlements';

// One place to show and enforce InfinitySheets+ locks.
export function usePlus() {
  const { state } = useApp();
  const plus = isPlus(state);
  // Returns true when allowed; otherwise shows the upgrade prompt and returns false.
  const requirePlus = (featureKey) => {
    if (plus) return true;
    const label = PLUS_FEATURES[featureKey] || 'This feature';
    toast(`${label} is an InfinitySheets+ feature`, { description: 'Upgrade to InfinitySheets+ to unlock it.', icon: '🔒' });
    return false;
  };
  return { isPlus: plus, requirePlus };
}

// Small "InfinitySheets+" lock chip shown next to a locked control.
export function PlusBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-semibold ${className}`} title="InfinitySheets+ only">
      <Lock className="w-3 h-3" /> +
    </span>
  );
}

// Wraps a control so free users see it greyed with a lock; clicking shows the
// upgrade prompt instead of doing the action. Plus users get the children as-is.
export function PlusLock({ feature, children, className = '' }) {
  const { isPlus: plus, requirePlus } = usePlus();
  if (plus) return children;
  return (
    <div className={`relative ${className}`}>
      <div className="opacity-45 pointer-events-none select-none" aria-hidden="true">{children}</div>
      <button
        type="button"
        onClick={() => requirePlus(feature)}
        className="absolute inset-0 flex items-center justify-center rounded-[inherit]"
        aria-label={`${PLUS_FEATURES[feature] || 'Feature'} — InfinitySheets+ only`}
        data-testid={`plus-lock-${feature}`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 text-white px-2 py-1 text-[11px] font-semibold shadow">
          <Lock className="w-3.5 h-3.5" /> InfinitySheets+
        </span>
      </button>
    </div>
  );
}

// A full-page upgrade screen for a locked route (Flashcards / Smart Learning).
export function PlusUpgradeScreen({ feature }) {
  const label = PLUS_FEATURES[feature] || 'This feature';
  return (
    <div className="max-w-[560px] mx-auto mt-10 rounded-2xl border border-violet-200 bg-violet-50/50 p-8 text-center" data-testid="plus-upgrade">
      <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center mx-auto mb-4"><Sparkles className="w-7 h-7" /></div>
      <h2 className="text-[20px] font-semibold text-slate-900">{label} is part of InfinitySheets+</h2>
      <p className="text-[13.5px] text-slate-600 mt-2 leading-snug">InfinitySheets+ unlocks the AI-powered tools — study plans, the coach, flashcards, worksheet diagnosis, ask-a-doubt, PDF export, custom courses and more than {6} subjects.</p>
      <div className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 text-white px-4 py-2 text-[13px] font-semibold"><Lock className="w-4 h-4" /> InfinitySheets+ only</div>
    </div>
  );
}
