import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Upload, FileText, Sparkles, Loader2, Plus, Trash2, GraduationCap, Search, CheckCircle2, ExternalLink, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { courseSearch, isAiEnabled } from '../../lib/ai';

/**
 * CustomCourseWizard
 * -----------------------------------------------------------------------------
 * Build a course from your own material. Files are uploaded into three labelled
 * buckets (questions, notes, syllabus). The "Find my course online" panel asks
 * the AI to search the web for the official course/specification that matches
 * what you describe, so we can pull the right material — the student is told
 * this is happening.
 *
 * Topic extraction from the uploaded documents is still a placeholder (derived
 * from filenames); the AI extraction pipeline is wired separately.
 * -----------------------------------------------------------------------------
 */

function placeholderTopicsFromFiles(files) {
  if (!files || files.length === 0) return ['Overview', 'Key concepts', 'Practice problems'];
  const seen = new Set();
  const topics = [];
  for (const f of files) {
    const bare = (f.name || 'Untitled').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const label = bare.charAt(0).toUpperCase() + bare.slice(1);
    if (label && !seen.has(label.toLowerCase())) { seen.add(label.toLowerCase()); topics.push(label); }
  }
  return topics.length ? topics : ['Overview', 'Key concepts'];
}
function placeholderSummaryForTopic(topic, file) {
  const src = file?.name ? ` (from ${file.name})` : '';
  return `Overview for “${topic}”${src}.`;
}

const CAT = {
  questions: { label: 'Questions', hint: 'Past papers, worksheets, question banks (PDF).', accept: '.pdf,image/*' },
  notes: { label: 'Notes', hint: 'Your notes, textbook chapters, slides (PDF).', accept: '.pdf,.ppt,.pptx,.txt,.md,image/*' },
  syllabus: { label: 'Syllabus', hint: 'The official syllabus / specification (PDF).', accept: '.pdf,.doc,.docx' },
};

export default function CustomCourseWizard({ onClose, onCreated }) {
  const { state, addCourse } = useApp();
  const aiOn = isAiEnabled(state);

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [byCat, setByCat] = useState({ questions: [], notes: [], syllabus: [] });
  const [busy, setBusy] = useState(false);

  // --- Web-search course matching -------------------------------------------
  const [history, setHistory] = useState([]);        // [{ role, content }]
  const [question, setQuestion] = useState(null);     // current AI clarifying question
  const [answer, setAnswer] = useState('');
  const [candidates, setCandidates] = useState(null); // null = not searched yet
  const [matched, setMatched] = useState(null);       // chosen candidate
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [round, setRound] = useState(0);

  const addFiles = (cat, list) => {
    if (!list) return;
    const incoming = Array.from(list).map((f) => ({ name: f.name, size: f.size, type: f.type, category: cat }));
    setByCat((prev) => {
      const seen = new Set(prev[cat].map((p) => p.name + '|' + p.size));
      return { ...prev, [cat]: [...prev[cat], ...incoming.filter((f) => !seen.has(f.name + '|' + f.size))] };
    });
  };
  const removeFile = (cat, idx) => setByCat((prev) => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));
  const allFiles = [...byCat.questions, ...byCat.notes, ...byCat.syllabus];
  const canSubmit = name.trim().length > 0 && subject.trim().length > 0;

  const runSearch = async (userReply) => {
    if (!aiOn) { toast.error('Turn AI on in Settings to search for your course'); return; }
    setSearching(true); setSearchErr('');
    const nextHistory = userReply ? [...history, { role: 'user', content: userReply }] : history;
    try {
      const { question: q, candidates: cands, note } = await courseSearch({ subject: subject.trim(), description: description.trim(), history: nextHistory });
      // Keep the exchange so the model has context on the next round.
      const modelTurn = q ? `Question: ${q}` : `Found ${cands.length} candidate(s).${note ? ` ${note}` : ''}`;
      setHistory([...nextHistory, { role: 'assistant', content: modelTurn }]);
      setAnswer('');
      setRound((r) => r + 1);
      // Stop asking after a few rounds even if the model wants more.
      if (q && round < 3 && !cands.length) { setQuestion(q); setCandidates(null); }
      else { setQuestion(null); setCandidates(cands); }
    } catch (e) {
      setSearchErr(e?.message || 'Could not search right now. You can still create the course.');
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) { toast.error('Give the course a name and a subject'); return; }
    setBusy(true);
    try {
      const topics = placeholderTopicsFromFiles(allFiles);
      const summaries = {};
      topics.forEach((t, i) => { summaries[t] = placeholderSummaryForTopic(t, allFiles[i]); });
      const courseId = `c_${Date.now()}`;
      addCourse({
        id: courseId,
        name: name.trim(),
        exam: 'Custom',
        custom: true,
        description: description.trim() || null,
        matchedCourse: matched || null, // the official course the student matched online
        materials: { questions: byCat.questions, notes: byCat.notes, syllabus: byCat.syllabus },
        subjects: [{ subject: subject.trim(), examDate: null, target: 'Medium', level: null, topics, topicSummaries: summaries }],
        files: allFiles, // metadata only — the file blobs never leave the browser here
        status: 'Active',
      });
      toast.success(`${name.trim()} added — course overview ready`);
      if (onCreated) onCreated({ courseId, subject: subject.trim() });
      if (onClose) onClose();
      window.location.hash = `#course-overview?id=${encodeURIComponent(courseId)}`;
    } catch (e) {
      toast.error(e?.message || 'Could not create custom course');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="custom-course-wizard">
      <div className="relative bg-white rounded-2xl border border-[color:var(--color-border)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[color:var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0"><GraduationCap className="w-4.5 h-4.5" /></span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-blue-600">Custom Course</div>
              <div className="text-[16px] font-semibold text-slate-900">Build a course from your own material</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Course name">
              <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., IB HL Chemistry — Term 2" data-testid="cc-name" />
            </Field>
            <Field label="Subject">
              <input className="input-base" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Chemistry, Data Structures, Music Theory" data-testid="cc-subject" />
            </Field>
          </div>

          <Field label="Short description">
            <textarea className="input-base" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this course about? Exam board, level, country — anything that helps identify it." data-testid="cc-description" />
            <span className="text-[11.5px] text-blue-800/80 inline-flex items-center gap-1 mt-1"><Search className="w-3.5 h-3.5" /> Our AI reads this to search the web for your official course and more study material for this subject.</span>
          </Field>

          {/* Web-search course matching */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-[13px] font-semibold text-blue-900">Find my course online</div>
              </div>
              {candidates === null && !question && (
                <button type="button" onClick={() => runSearch(null)} disabled={searching || !subject.trim()} className="btn-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold disabled:opacity-40" data-testid="cc-search">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search the web
                </button>
              )}
            </div>
            <p className="text-[11.5px] text-blue-900/70 mt-1">The AI searches for real, official courses and specifications that match yours — it may ask a couple of quick questions first.</p>

            {matched ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-start gap-2" data-testid="cc-matched">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0 text-[12.5px]">
                  <div className="font-semibold text-emerald-900">{matched.name}</div>
                  {(matched.org || matched.level) && <div className="text-emerald-800/80">{[matched.org, matched.level].filter(Boolean).join(' · ')}</div>}
                  <button type="button" onClick={() => { setMatched(null); }} className="text-emerald-700 hover:text-emerald-900 underline mt-0.5">Choose a different one</button>
                </div>
              </div>
            ) : (
              <>
                {question && (
                  <div className="mt-3" data-testid="cc-search-question">
                    <div className="text-[12.5px] font-medium text-slate-800 flex items-start gap-1.5"><HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" /> {question}</div>
                    <div className="mt-2 flex gap-2">
                      <input className="input-base flex-1" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" data-testid="cc-search-answer"
                        onKeyDown={(e) => { if (e.key === 'Enter' && answer.trim()) { e.preventDefault(); runSearch(answer.trim()); } }} />
                      <button type="button" onClick={() => answer.trim() && runSearch(answer.trim())} disabled={searching || !answer.trim()} className="btn-violet px-3 py-2 rounded-lg text-[12.5px] font-semibold disabled:opacity-40" data-testid="cc-search-send">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                      </button>
                    </div>
                  </div>
                )}
                {Array.isArray(candidates) && (
                  candidates.length ? (
                    <div className="mt-3 flex flex-col gap-2" data-testid="cc-candidates">
                      <div className="text-[12px] text-slate-600">Pick the one that matches your course:</div>
                      {candidates.map((c, i) => (
                        <div key={i} className="rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2.5 flex items-start gap-3" data-testid={`cc-candidate-${i}`}>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-slate-900">{c.name}</div>
                            {(c.org || c.level) && <div className="text-[11.5px] text-slate-500">{[c.org, c.level].filter(Boolean).join(' · ')}</div>}
                            {c.why && <div className="text-[11.5px] text-slate-600 mt-0.5">{c.why}</div>}
                            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 mt-0.5">{c.url.replace(/^https?:\/\//, '').slice(0, 42)} <ExternalLink className="w-3 h-3" /></a>}
                          </div>
                          <button type="button" onClick={() => setMatched(c)} className="btn-outline-dark px-3 py-1.5 rounded-lg text-[12px] font-semibold shrink-0" data-testid={`cc-match-${i}`}>This is mine</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => runSearch('None of these match — try again with different options.')} disabled={searching} className="text-[12px] text-slate-500 hover:text-slate-800 self-start">None of these — search again</button>
                    </div>
                  ) : (
                    <div className="mt-3 text-[12.5px] text-slate-500">No official course was found. You can still create the course from your material.</div>
                  )
                )}
                {searchErr && <div className="mt-3 text-[12px] text-amber-700">{searchErr}</div>}
              </>
            )}
          </div>

          {/* Three material buckets */}
          {Object.keys(CAT).map((cat) => (
            <Dropzone key={cat} cat={cat} files={byCat[cat]} onAdd={(list) => addFiles(cat, list)} onRemove={(i) => removeFile(cat, i)} />
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[color:var(--color-border)] px-6 py-4 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-slate-500">{allFiles.length} file{allFiles.length === 1 ? '' : 's'} attached</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3.5 py-2 rounded-md text-[13px] font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
            <button onClick={submit} disabled={!canSubmit || busy} data-testid="cc-submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-40">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {busy ? 'Building course…' : 'Create custom course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dropzone({ cat, files, onAdd, onRemove }) {
  const [dragOver, setDragOver] = useState(false);
  const meta = CAT[cat];
  return (
    <div>
      <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2">{meta.label}</div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onAdd(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50/60' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'}`}
        data-testid={`cc-dropzone-${cat}`}
      >
        <Upload className="w-5 h-5 text-slate-500" />
        <div className="text-[12.5px] text-slate-700 font-medium">Drop {meta.label.toLowerCase()} here or click to browse</div>
        <div className="text-[11px] text-slate-500">{meta.hint}</div>
        <input type="file" accept={meta.accept} multiple className="hidden" onChange={(e) => onAdd(e.target.files)} data-testid={`cc-input-${cat}`} />
      </label>
      {files.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-[12.5px] font-medium text-slate-800 truncate">{f.name}</span>
                <span className="text-[11px] text-slate-500 shrink-0">{Math.max(1, Math.round((f.size || 0) / 1024))} KB</span>
              </div>
              <button onClick={() => onRemove(i)} className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0" aria-label="Remove file"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
