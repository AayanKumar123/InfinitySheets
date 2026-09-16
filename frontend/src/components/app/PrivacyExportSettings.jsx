import React from 'react';
import { ShieldCheck, Download, FileSpreadsheet, MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { exportJson, exportCsv } from '../../lib/exportData';
import { track } from '../../lib/analytics';

const BAND_LABEL = { under13: 'Under 13', '13to17': '13 – 17', '18plus': '18 or over' };

// Settings → Privacy & your data: the consent answers (re-editable) and a
// one-click export of everything the app holds.
export function PrivacySection() {
  const { state, recordConsent } = useApp();
  const c = state.consent;
  const setBand = (band) => recordConsent({ ageBand: band, aiConsent: band === 'under13' ? !!c?.parentConsent && !!c?.aiConsent : c?.aiConsent !== false, parentConsent: band === 'under13' ? !!c?.parentConsent : null });
  const setAi = (on) => {
    if (on && c?.ageBand === 'under13' && !c?.parentConsent) { toast.error('Under 13: a parent or guardian needs to OK the AI first — tick the box below.'); return; }
    recordConsent({ ...c, aiConsent: on });
    toast.success(on ? 'AI helpers on' : 'AI helpers off — nothing is sent to Gemini');
  };
  const setParent = (ok) => recordConsent({ ...c, parentConsent: ok, aiConsent: ok ? c?.aiConsent !== false : false });

  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="privacy-section">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4" /></span>
        <div><div className="text-[15px] font-semibold text-slate-900">Privacy &amp; your data</div><div className="text-[12.5px] text-slate-500 mt-0.5">What you told us, what the AI sees, and a copy of everything we hold.</div></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-1.5">Age</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(BAND_LABEL).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setBand(k)} className={`px-3 py-1.5 rounded-md border text-[12.5px] font-medium ${c?.ageBand === k ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-zinc-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-1.5">AI helpers (Google Gemini)</div>
          <label className="flex items-start gap-3 cursor-pointer">
            <button type="button" onClick={() => setAi(!(c?.aiConsent && state.settings?.aiEnabled !== false))} aria-pressed={!!c?.aiConsent && state.settings?.aiEnabled !== false} data-testid="privacy-ai" className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${c?.aiConsent && state.settings?.aiEnabled !== false ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${c?.aiConsent && state.settings?.aiEnabled !== false ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <span className="text-[12px] text-slate-600 leading-snug">Questions, typed answers and photos of working are sent to Gemini only while this is on. Your name and email never are.</span>
          </label>
          {c?.ageBand === 'under13' && (
            <label className="mt-2 flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer"><input type="checkbox" className="mt-0.5" checked={!!c?.parentConsent} onChange={(e) => setParent(e.target.checked)} /> A parent or guardian is OK with me using the AI helpers.</label>
          )}
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-[color:var(--color-border)] flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-slate-600 mr-2">Download a copy of your data:</span>
        <button onClick={() => { exportJson(state); track('data_exported', { format: 'json' }); }} className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px]" data-testid="export-json"><Download className="w-3.5 h-3.5" /> Everything (JSON)</button>
        <button onClick={() => { exportCsv(state); track('data_exported', { format: 'csv' }); }} className="btn-outline-dark inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px]" data-testid="export-csv"><FileSpreadsheet className="w-3.5 h-3.5" /> Worksheets (CSV)</button>
      </div>
    </section>
  );
}

export function ThemeModeToggle() {
  const { state, setThemeMode } = useApp();
  const on = state.themeMode === 'system';
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button type="button" onClick={() => { setThemeMode(on ? 'manual' : 'system'); toast.success(on ? 'Theme set manually' : 'Theme now follows your device'); }} data-testid="pref-theme-system" aria-pressed={on} className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-slate-900 inline-flex items-center gap-1.5"><MonitorSmartphone className="w-4 h-4 text-slate-600" /> Follow my device's theme</div>
        <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">Switches between light and dark automatically with your phone or computer. Using the theme button turns this off.</div>
      </div>
    </label>
  );
}
