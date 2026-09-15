import React, { useCallback, useEffect, useState } from 'react';
import { BookMarked, Upload, Loader2, Check, X, Flag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { extractSyllabusTopics, isAiEnabled } from '../../lib/ai';
import { filesToAiParts } from '../../lib/images';
import * as store from '../../lib/dataStore';
import { TOPICS } from '../../data/mock';

// Admin: import a board's syllabus PDF → topic list that overrides the
// built-in TOPICS for that (board, subject) everywhere in the app.
export function SyllabusImport({ board, subject }) {
  const { state, setSyllabusTopics } = useApp();
  const isReal = !!(state.user && !state.user.isDemo && state.user.id);
  const existing = (state.syllabusTopics || []).find((r) => r.board === board && r.subject === subject);
  const [drafts, setDrafts] = useState(null);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const aiOn = isAiEnabled(state);

  const onFile = async (file) => {
    if (!file) return;
    if (!aiOn) { toast.error('Turn on the AI in Settings to read a syllabus'); return; }
    setBusy(true);
    try {
      const [part] = await filesToAiParts([file]);
      const topics = await extractSyllabusTopics({ file: part, board, subject });
      if (!topics.length) throw new Error('No topics found in that file');
      setDrafts(topics);
      setSource(file.name);
      toast.success(`${topics.length} topics read from the syllabus`);
    } catch (e) { toast.error(e.message || 'Could not read the syllabus'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    const topics = (drafts || []).filter((t) => t.name.trim());
    if (!topics.length) return;
    setSaving(true);
    try {
      if (isReal) await store.upsertSyllabusTopics({ board, subject, topics, source }, state.user.id);
      const rows = (state.syllabusTopics || []).filter((r) => !(r.board === board && r.subject === subject));
      setSyllabusTopics([...rows, { board, subject, topics, source }]);
      setDrafts(null);
      toast.success(isReal ? `Syllabus saved — ${subject} now uses these ${topics.length} topics` : 'Saved on this device (sign in as an admin to publish for everyone)');
    } catch (e) { toast.error(e.message || 'Could not save'); }
    finally { setSaving(false); }
  };
  const builtIn = TOPICS[subject] || [];

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="admin-syllabus-import">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[14px] font-semibold text-slate-900 inline-flex items-center gap-2"><BookMarked className="w-4 h-4 text-violet-600" /> Syllabus topics · {board} {subject}</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5">{existing ? `${existing.topics.length} imported topics in use${existing.source ? ` (from ${existing.source})` : ''}.` : `Using the ${builtIn.length} built-in topics.`} Upload the official syllabus PDF and the AI lists its topics; save to replace the built-in list for this subject.</div>
        </div>
        <label className={`btn-outline-dark inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload syllabus PDF
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="admin-syllabus-file" />
        </label>
      </div>
      {drafts && (
        <div>
          <div className="grid sm:grid-cols-2 gap-1.5 max-h-[360px] overflow-auto pr-1" data-testid="admin-syllabus-drafts">
            {drafts.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-[color:var(--color-border)] px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <input className="input-base w-full text-[12.5px] py-1" value={t.name} onChange={(e) => setDrafts((d) => d.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                  {t.summary && <div className="text-[11px] text-slate-500 mt-1 truncate" title={t.summary}>{t.summary}</div>}
                </div>
                <button onClick={() => setDrafts((d) => d.filter((_, k) => k !== i))} className="text-slate-400 hover:text-rose-600 mt-1"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={save} disabled={saving} className="btn-violet inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-60" data-testid="admin-syllabus-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save {drafts.length} topics</button>
            <button onClick={() => setDrafts(null)} className="text-[12.5px] text-slate-500 hover:text-slate-800">Discard</button>
          </div>
        </div>
      )}
      {!drafts && existing && (
        <div className="flex flex-wrap gap-1.5">
          {existing.topics.map((t) => <span key={t.name} className="px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-900 text-[11.5px]" title={t.summary}>{t.name}</span>)}
        </div>
      )}
    </div>
  );
}

// Admin: the question-flag queue. Fix / dismiss; 3+ open flags on a bank
// question hides it from new worksheets until an admin acts.
export function FlagQueue() {
  const { state, removePastPaper } = useApp();
  const isReal = !!(state.user && !state.user.isDemo && state.user.id);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(isReal);
  const load = useCallback(() => {
    if (!isReal) return;
    setLoading(true);
    store.listQuestionFlags('open').then(setFlags).catch((e) => toast.error(e.message || 'Could not load flags')).finally(() => setLoading(false));
  }, [isReal]);
  useEffect(() => { load(); }, [load]);
  const act = async (f, status) => {
    try { await store.setFlagStatus(f.id, status); setFlags((l) => l.filter((x) => x.id !== f.id)); }
    catch (e) { toast.error(e.message || 'Could not update'); }
  };
  const remove = async (f) => {
    if (!f.question_id || !window.confirm('Delete this question from the bank and close the flag?')) return;
    try { await removePastPaper(f.question_id); await act(f, 'fixed'); toast.success('Question removed'); }
    catch (e) { toast.error(e.message || 'Could not delete'); }
  };
  const counts = {};
  flags.forEach((f) => { const k = f.question_id || f.question; counts[k] = (counts[k] || 0) + 1; });

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="admin-flags">
      <div className="text-[14px] font-semibold text-slate-900 inline-flex items-center gap-2 mb-1"><Flag className="w-4 h-4 text-rose-600" /> Reported questions {flags.length ? <span className="text-[11.5px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">{flags.length}</span> : null}</div>
      <div className="text-[12.5px] text-slate-500 mb-3">Students report wrong answers, unclear wording or off-syllabus questions. A bank question with 3 or more open reports is hidden from new worksheets automatically.</div>
      {!isReal ? <div className="text-[12.5px] text-slate-500">Sign in with an admin account to see the queue.</div>
        : loading ? <div className="text-[12.5px] text-slate-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        : flags.length === 0 ? <div className="text-[12.5px] text-slate-500">No open reports.</div> : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {flags.map((f) => (
              <li key={f.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-slate-800 line-clamp-2">{f.question}</div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5">{f.subject || 'Unknown subject'} · <span className="font-semibold text-rose-700">{f.reason}</span>{f.note ? ` · “${f.note}”` : ''} · {new Date(f.created_at).toLocaleDateString()}{(counts[f.question_id || f.question] || 0) > 1 ? ` · ${counts[f.question_id || f.question]} reports` : ''}{f.question_id ? '' : ' · AI-generated (not in bank)'}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {f.question_id && <button onClick={() => remove(f)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-200 text-rose-700 text-[12px] hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /> Delete question</button>}
                  <button onClick={() => act(f, 'fixed')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-700 text-[12px] hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /> Fixed</button>
                  <button onClick={() => act(f, 'dismissed')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 text-[12px] hover:bg-slate-50"><X className="w-3.5 h-3.5" /> Dismiss</button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
