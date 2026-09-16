import React, { useState } from 'react';
import { ShieldCheck, Bot, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { track } from '../../lib/analytics';

// Shown once per account (after onboarding): the student's age band and a
// plain-language choice about the AI. Under-13s need a parent's OK before
// any of their work is sent to Gemini; without it the AI stays off.
const BANDS = [
  ['under13', 'Under 13'],
  ['13to17', '13 – 17'],
  ['18plus', '18 or over'],
];

export default function ConsentGate() {
  const { state, recordConsent } = useApp();
  const [band, setBand] = useState(state.consent?.ageBand || '');
  const [ai, setAi] = useState(true);
  const [parent, setParent] = useState(false);
  const minor = band === 'under13';
  const canContinue = band && (!minor || !ai || parent);

  const save = () => {
    const aiConsent = !!ai && (!minor || parent);
    recordConsent({ ageBand: band, aiConsent, parentConsent: minor ? parent : null });
    track('consent_recorded', { band, aiConsent });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" data-testid="consent-gate">
      <div className="w-full max-w-[560px] rounded-2xl bg-white border border-[color:var(--color-border)] shadow-2xl p-6">
        <div className="eyebrow-muted mb-1 inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Before you start</div>
        <h2 className="text-[20px] font-semibold text-slate-900">Two quick questions about your data</h2>
        <p className="text-[13px] text-slate-600 mt-1">We ask everyone once. You can change both answers later in Settings.</p>

        <div className="mt-5">
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2">How old are you?</div>
          <div className="flex flex-wrap gap-2">
            {BANDS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => setBand(k)} data-testid={`consent-${k}`} className={`px-3.5 py-2 rounded-lg border text-[13px] font-medium transition-colors ${band === k ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[color:var(--color-border)] bg-slate-50/60 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <button type="button" onClick={() => setAi((v) => !v)} data-testid="consent-ai" aria-pressed={ai} className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${ai ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ai ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <div>
              <div className="text-[13.5px] font-medium text-slate-900 inline-flex items-center gap-1.5"><Bot className="w-4 h-4 text-slate-600" /> Use the AI helpers</div>
              <div className="text-[12px] text-slate-600 mt-0.5 leading-snug">With this on, the questions you answer, your typed answers and any photos of working you upload are sent to Google Gemini to write questions, mark work and explain mistakes. Nothing is used to train Google's models under the terms we use, and we never send your name or email. Off = every AI feature is hidden and nothing leaves the app.</div>
            </div>
          </label>
          {minor && ai && (
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer text-[12.5px] text-slate-800" data-testid="consent-parent">
              <input type="checkbox" className="mt-0.5" checked={parent} onChange={(e) => setParent(e.target.checked)} />
              <span>A parent or guardian has read this and is OK with me using the AI helpers.</span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-between mt-5 gap-3">
          <a href="#privacy" target="_blank" rel="noreferrer" className="text-[12.5px] text-slate-500 hover:text-slate-800">Read the privacy policy</a>
          <button type="button" onClick={save} disabled={!canContinue} data-testid="consent-save" className="btn-violet inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold disabled:opacity-50">
            <Check className="w-4 h-4" /> Continue
          </button>
        </div>
      </div>
    </div>
  );
}
