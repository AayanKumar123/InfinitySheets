import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, AlertTriangle, PlayCircle } from 'lucide-react';
import EmptyStateScene from '../decor/EmptyStateScene';
import CreateWorksheetButton from './CreateWorksheetButton';
import SubjectGroupedList from './SubjectGroupedList';

// Action row shown above the worksheet list. Kept as its own component so it
// renders identically in the empty state and the populated state below.
function ActionButtons() {
  return (
    <div className="flex justify-end mb-4 gap-2 flex-wrap">
      <CreateWorksheetButton
        onClick={() => { window.location.hash = '#worksheets'; }}
        data-testid="history-new-worksheet-btn"
      />
      <button
        onClick={() => { window.location.hash = '#mistakes'; }}
        data-testid="mistake-history-btn"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-blue-600 hover:opacity-95 transition-opacity"
      >
        <AlertTriangle className="w-5 h-5" /> Mistake History
      </button>
    </div>
  );
}

// Banner offering to resume an in-progress worksheet the student left mid-way.
function ContinueBanner({ draft, onResume, onDiscard }) {
  if (!draft || !(draft.questions || []).length) return null;
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-4 flex flex-wrap items-center justify-between gap-4"
      data-testid="history-continue-worksheet"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <PlayCircle className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-amber-700">Unfinished worksheet</div>
          <div className="text-[15px] font-semibold text-slate-900 truncate">
            {draft.subject}{draft.topics && draft.topics.length ? ` · ${draft.topics.join(', ')}` : ''}
          </div>
          <div className="text-[12px] text-slate-500 mt-0.5">
            {draft.answered || 0} of {draft.total || (draft.questions || []).length} answered
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onDiscard}
          data-testid="history-discard-worksheet"
          className="px-3.5 py-2 rounded-lg text-[13px] font-medium border border-[color:var(--color-border)] bg-white hover:bg-slate-100 text-slate-700 transition-colors"
        >
          Discard
        </button>
        <button
          onClick={onResume}
          data-testid="history-resume-worksheet"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-amber-600 hover:opacity-95 transition-opacity"
        >
          <PlayCircle className="w-5 h-5" /> Continue
        </button>
      </div>
    </div>
  );
}

export default function WorksheetHistory() {
  const { state, clearDraftWorksheet } = useApp();
  const ws = state.worksheets || [];
  const draft = state.draftWorksheet;

  const resumeDraft = () => {
    try { window.sessionStorage.setItem('resume_ws_draft', '1'); } catch (_) { /* ignore */ }
    window.location.hash = '#worksheets';
  };

  if (ws.length === 0) {
    return (
      <div>
        <ActionButtons />
        <ContinueBanner draft={draft} onResume={resumeDraft} onDiscard={clearDraftWorksheet} />
        <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
          <EmptyStateScene variant="lab" className="absolute inset-0" />
          <div className="relative p-12 text-center">
            <FileText className="w-6 h-6 text-slate-400 mx-auto mb-3" />
            <div className="text-[15px] font-medium text-slate-700">No saved attempts yet</div>
            <div className="text-[13px] text-slate-500 mt-1">Complete a worksheet to see it appear here.</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <ActionButtons />
      <ContinueBanner draft={draft} onResume={resumeDraft} onDiscard={clearDraftWorksheet} />
      <SubjectGroupedList
        items={ws}
        testIdPrefix="history"
        itemLabelSingular="worksheet"
        itemLabelPlural="worksheets"
        renderItem={(w) => (
          <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-5 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-slate-900">{w.topic}</div>
              <div className="text-[12.5px] text-slate-500 mt-1">{new Date(w.date).toLocaleString()} &middot; {w.difficulty} &middot; {w.length} questions</div>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-semibold text-slate-900">{w.score}%</div>
              <div className="text-[12.5px] text-slate-500">{w.correct}/{w.total} correct</div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
