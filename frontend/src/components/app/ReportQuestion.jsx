import React, { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { flagQuestion } from '../../lib/dataStore';
import { track } from '../../lib/analytics';

const REASONS = [
  ['wrong-answer', 'The marked answer is wrong'],
  ['unclear', 'Question is unclear / ambiguous'],
  ['off-syllabus', 'Not in my syllabus'],
  ['typo', 'Typo or broken formatting'],
  ['other', 'Something else'],
];

// "Report question": students flag a bad question; admins review the queue
// on the Admin page. Three open flags hide a bank question from new sheets.
export default function ReportQuestion({ q, subject, compact = false, testid }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('wrong-answer');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const isReal = state.user && state.user.id;

  const send = async () => {
    setBusy(true);
    try {
      if (isReal) await flagQuestion({ questionId: q.id, question: q.q, subject, reason, note }, state.user.id);
      track('question_flagged', { reason, source: q.source });
      setDone(true);
      setOpen(false);
      toast.success(isReal ? 'Thanks — an admin will review this question' : 'Thanks — flags are saved for real accounts; in the demo this is a preview');
    } catch (e) {
      toast.error(e.message || 'Could not send the report');
    } finally { setBusy(false); }
  };

  if (done) return <span className="text-[11.5px] text-slate-500 inline-flex items-center gap-1"><Flag className="w-3 h-3" /> Reported</span>;
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} data-testid={testid} title="Report a problem with this question" className={`inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 transition-colors ${compact ? 'text-[11px]' : 'text-[11.5px]'}`}>
        <Flag className="w-3 h-3" /> Report
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[280px] rounded-xl border border-[color:var(--color-border)] bg-white p-3 shadow-xl text-left" data-testid="report-popover">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12.5px] font-semibold text-slate-900">What is wrong?</div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex flex-col gap-1">
            {REASONS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                <input type="radio" name={`reason-${q.q?.slice(0, 12)}`} checked={reason === k} onChange={() => setReason(k)} /> {label}
              </label>
            ))}
          </div>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional detail" className="input-base w-full text-[12px] mt-2" />
          <button type="button" onClick={send} disabled={busy} className="btn-violet w-full mt-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-60">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Send report'}
          </button>
        </div>
      )}
    </span>
  );
}
