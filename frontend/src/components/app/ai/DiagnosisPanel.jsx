import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stethoscope, Loader2, RefreshCw, Settings as SettingsIcon, ChevronDown } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { diagnoseWorksheet, isAiEnabled } from '../../../lib/ai';
import { subjectBoards } from '../../../lib/subjects';
import { MarkdownLite } from './AiChat';

/**
 * Post-worksheet diagnosis: the AI goes through what went wrong and what
 * could have been done better, then the result is saved onto the worksheet
 * (so it shows up in Smart Learning and on the Dashboard).
 *
 *   sheet     — the worksheet record (needs questions / answers / results)
 *   autoRun   — start immediately when there is no saved diagnosis yet
 *   compact   — collapsed-by-default card for lists
 */
export default function DiagnosisPanel({ sheet, autoRun = false, compact = false, testid = 'diagnosis' }) {
  const { state, updateWorksheet } = useApp();
  const enabled = isAiEnabled(state);
  // Always read the live record so a save re-renders every copy of the panel.
  const live = (state.worksheets || []).find((w) => w.id === sheet?.id) || sheet;
  const saved = live?.diagnosis || null;

  const examTrack = state.user?.examTrack || 'CBSE';
  const board = useMemo(() => subjectBoards(state.courses, examTrack)[live?.subject]?.board || examTrack, [state.courses, examTrack, live?.subject]);
  const ibLevel = useMemo(() => subjectBoards(state.courses, examTrack)[live?.subject]?.ibLevel, [state.courses, examTrack, live?.subject]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(!compact);
  const startedRef = useRef(false);

  const run = async () => {
    if (!live || busy) return;
    setBusy(true); setError(null); setOpen(true);
    try {
      const text = await diagnoseWorksheet(live, { board, ibLevel });
      updateWorksheet(live.id, { diagnosis: { text, createdAt: new Date().toISOString(), board } });
    } catch (e) {
      setError(e.message || 'Could not run the diagnosis.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoRun && enabled && !saved && !startedRef.current) { startedRef.current = true; run(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, enabled, saved]);

  if (!live) return null;
  const when = saved?.createdAt ? new Date(saved.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white" data-testid={testid}>
      <div className={`px-5 pt-4 ${open ? 'pb-3 border-b border-[color:var(--color-border)]' : 'pb-4'} flex items-start gap-3`}>
        <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900 flex flex-wrap items-center gap-x-2">
            {compact ? `${live.subject} · ${live.topic}` : 'Diagnosis'}
            {compact && <span className="text-[12px] font-semibold text-slate-500 tabular-nums">{live.score}%</span>}
          </div>
          <div className="text-[12.5px] text-slate-500 mt-0.5">
            {compact
              ? `${new Date(live.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${saved ? ' · diagnosed' : ' · not diagnosed yet'}`
              : saved ? `Where you went wrong and what to do next${when ? ` · ${when}` : ''}.` : 'The AI goes through every question you missed and what would have scored.'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {enabled && saved && !busy && (
            <button onClick={run} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900" data-testid={`${testid}-rerun`}>
              <RefreshCw className="w-4 h-4" /> Re-run
            </button>
          )}
          {enabled && !saved && !busy && !autoRun && (
            <button onClick={run} className="btn-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" data-testid={`${testid}-run`}>
              <Stethoscope className="w-4 h-4" /> Run diagnosis
            </button>
          )}
          {compact && (saved || busy || error) && (
            <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'} className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 flex items-center justify-center">
              <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-5 py-4">
          {!enabled ? (
            <p className="text-[13px] text-slate-600">AI assistants are off. <a href="#settings" className="text-blue-700 font-medium hover:underline inline-flex items-center gap-1"><SettingsIcon className="w-3.5 h-3.5" />Turn on in Settings</a></p>
          ) : busy ? (
            <div className="inline-flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Going through your answers…</div>
          ) : error ? (
            <div className="flex flex-col items-start gap-2">
              <div className="text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2" role="alert">{error}</div>
              <button onClick={run} className="text-[12.5px] font-medium text-blue-700 hover:underline">Try again</button>
            </div>
          ) : saved ? (
            <MarkdownLite text={saved.text} />
          ) : (
            <p className="text-[13px] text-slate-500">No diagnosis yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Short plain-text teaser for the Dashboard tile.
export function diagnosisSnippet(text, max = 110) {
  const line = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#')) || '';
  const clean = line.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '');
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
