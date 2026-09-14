import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Plus, Trash2, FileText, Sparkles, Filter, Upload, Link2, X, Loader2, Check, FlaskConical, ClipboardCheck, PenTool } from 'lucide-react';
import { SUBJECTS, TOPICS, EXAM_TRACKS } from '../../data/mock';
import { FULL_PAPER_TYPE } from '../../data/pastPapers';
import { toast } from 'sonner';
import { extractFromPdf, isAiEnabled } from '../../lib/ai';
import { filesToAiParts } from '../../lib/images';

const ANSWER_TYPES = ['Multiple choice', 'Typed response', 'Exam style', 'Drawing', FULL_PAPER_TYPE];
const DIFFICULTIES = ['Easy', 'Medium', 'Exam level', 'Hard'];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function emptyForm({ syllabus, subject }) {
  const topics = TOPICS[subject] || [];
  return {
    subject: subject || '',
    topic: topics[0] || '',
    year: '',
    board: syllabus || '',
    difficulty: 'Medium',
    answerType: 'Multiple choice',
    link: '',
    q: '',
    options: ['', '', '', ''],
    a: 0,
    typedAnswer: '',
    typedAliases: '',
    examAnswer: '',
    examKeywords: '',
    marks: '',
    markScheme: [],   // [{ point, marks }] — the examiner's scheme, any answer type
  };
}

// Sum of the scheme's marks; falls back to the question's marks field.
export function schemeTotal(scheme, fallback) {
  const t = (Array.isArray(scheme) ? scheme : []).reduce((s, p) => s + (Number(p.marks) || 0), 0);
  return t || (fallback ? Number(fallback) : 0) || 0;
}

const cleanScheme = (scheme) => (Array.isArray(scheme) ? scheme : [])
  .map((p) => ({ point: (p.point || '').trim(), marks: Math.max(1, parseInt(p.marks, 10) || 1) }))
  .filter((p) => p.point);

// --------------------------------------------------------------------------
// Root component
// --------------------------------------------------------------------------

export default function AdminPlaceholder() {
  const { state, addPastPaper, removePastPaper, seedTestPerformance } = useApp();
  const defaultSyllabus = state.user?.examTrack || 'CBSE';
  const [syllabus, setSyllabus] = useState(defaultSyllabus);
  const [subject, setSubject] = useState(() => (SUBJECTS[defaultSyllabus] || [])[0] || '');

  // If syllabus changes, reset subject to first available.
  useEffect(() => {
    const subs = SUBJECTS[syllabus] || [];
    if (!subs.includes(subject)) setSubject(subs[0] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syllabus]);

  const subjectsForSyllabus = SUBJECTS[syllabus] || [];

  const handleSeed = () => {
    if (!window.confirm('Replace your worksheet history with 9 randomized attempts per subject? This overwrites current progress.')) return;
    seedTestPerformance();
    toast.success('Test performance seeded — check Dashboard, Performance and history.');
  };

  return (
    <div className="max-w-[1200px]" data-testid="admin-placeholder">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[11px] tracking-[0.16em] uppercase font-semibold text-blue-600">Admin</div>
          <h2 className="text-[20px] sm:text-[24px] font-semibold tracking-tight text-slate-900">Past paper question bank</h2>
        </div>
        <button
          onClick={handleSeed}
          data-testid="admin-seed-performance"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13.5px] font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm shrink-0"
        >
          <FlaskConical className="w-5 h-5" />
          Create test performance
        </button>
      </div>

      {/* Category picker */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5 mb-5">
        <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-blue-700 mb-3">Category</div>
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 mb-4" data-testid="admin-syllabus-grid">
          {EXAM_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSyllabus(t.id)}
              data-testid={`admin-syllabus-${t.id}`}
              className={`px-3 py-2.5 rounded-lg border text-[13px] font-semibold transition-colors ${syllabus === t.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-blue-700 mb-2">Subject</div>
        <div className="flex flex-wrap gap-2" data-testid="admin-subject-grid">
          {subjectsForSyllabus.length === 0 ? (
            <div className="text-[12.5px] text-slate-500">No subjects for this syllabus yet.</div>
          ) : subjectsForSyllabus.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              data-testid={`admin-subject-${s.replace(/\s+/g, '-')}`}
              className={`px-3 py-1.5 rounded-md border text-[12.5px] font-semibold transition-colors ${subject === s ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Category-scoped content */}
      {subject && (
        <CategoryPanel
          key={`${syllabus}::${subject}`}
          syllabus={syllabus}
          subject={subject}
          pastPapers={state.pastPapers || []}
          addPastPaper={addPastPaper}
          removePastPaper={removePastPaper}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// CategoryPanel — everything scoped to (syllabus, subject)
// --------------------------------------------------------------------------

function CategoryPanel({ syllabus, subject, pastPapers, addPastPaper, removePastPaper }) {
  const { state } = useApp();
  const addedBy = state.user?.email || (state.user?.isDemo ? 'demo' : 'unknown');
  const [form, setForm] = useState(() => emptyForm({ syllabus, subject }));
  const [filterTopic, setFilterTopic] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset form whenever the parent category changes (component is keyed, but
  // keep this for safety).
  useEffect(() => { setForm(emptyForm({ syllabus, subject })); setFilterTopic(''); }, [syllabus, subject]);

  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));

  const topicsList = TOPICS[subject] || [];

  const scopedPastPapers = useMemo(() => {
    return pastPapers.filter((p) => p.subject === subject && (!syllabus || !p.board || p.board === syllabus));
  }, [pastPapers, subject, syllabus]);

  const filteredPastPapers = useMemo(() => {
    if (!filterTopic) return scopedPastPapers;
    return scopedPastPapers.filter((p) => p.topic === filterTopic);
  }, [scopedPastPapers, filterTopic]);

  const validate = () => {
    const isPaper = form.answerType === FULL_PAPER_TYPE;
    if (!isPaper && !form.topic) return 'Pick a topic';
    if (!form.q.trim()) return isPaper ? 'Enter the paper title' : 'Enter a question';
    if (isPaper && !form.link.trim()) return 'A full paper needs a link to the official source';
    if (form.answerType === 'Multiple choice') {
      if (form.options.filter((o) => o.trim()).length < 2) return 'Add at least two options';
      if (!form.options[form.a] || !form.options[form.a].trim()) return 'Pick a correct option that has text';
    }
    if (form.answerType === 'Typed response' && !form.typedAnswer.trim()) return 'Enter the expected typed answer';
    if (form.answerType === 'Exam style' && !form.examAnswer.trim()) return 'Enter the model exam-style answer';
    if (form.answerType === 'Drawing' && !cleanScheme(form.markScheme).length && !form.examAnswer.trim()) return 'A drawing question needs a marking scheme or a description of the expected drawing';
    if (form.link && !/^https?:\/\//i.test(form.link.trim())) return 'Link must start with http:// or https://';
    return null;
  };

  const buildPayload = () => {
    const base = {
      subject,
      topic: form.answerType === FULL_PAPER_TYPE ? '' : form.topic,
      year: form.year ? parseInt(form.year, 10) : null,
      board: syllabus,
      difficulty: form.difficulty,
      answerType: form.answerType,
      marks: form.marks ? parseInt(form.marks, 10) : null,
      link: form.link.trim() || null,
      addedBy,
      q: form.q.trim(),
      source: 'past-paper',
    };
    if (form.answerType === 'Multiple choice') {
      base.options = form.options.map((o) => o.trim());
      base.a = form.a;
    } else if (form.answerType === 'Typed response') {
      base.typedAnswer = form.typedAnswer.trim();
      base.typedAliases = form.typedAliases.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (form.answerType === 'Exam style') {
      base.examAnswer = form.examAnswer.trim();
      base.examKeywords = form.examKeywords.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (form.answerType === 'Drawing') {
      base.examAnswer = form.examAnswer.trim();
    }
    const scheme = cleanScheme(form.markScheme);
    if (scheme.length) {
      base.markScheme = scheme;
      if (!base.marks) base.marks = schemeTotal(scheme);
    }
    return base;
  };

  const submit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      await addPastPaper(buildPayload());
      toast.success('Past paper question saved');
      setForm(emptyForm({ syllabus, subject }));
    } catch (e) {
      toast.error(e?.message || 'Could not save question');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
      {/* Left column: add form + bulk PDF upload */}
      <div className="flex flex-col gap-5 min-w-0">
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[12px] tracking-[0.16em] uppercase font-semibold text-blue-700">Add a past-paper question</div>
            <span className="text-[11px] font-semibold text-slate-500">{syllabus} · {subject}</span>
          </div>
          <p className="text-[12.5px] text-slate-500 mb-4">These questions feed the worksheet builder when learners tick <span className="font-semibold">Past paper questions</span>.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Topic">
              <select className="input-base" value={form.topic} onChange={(e) => setF({ topic: e.target.value })} data-testid="admin-topic">
                <option value="">Pick a topic</option>
                {topicsList.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Difficulty">
              <select className="input-base" value={form.difficulty} onChange={(e) => setF({ difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Answer type">
              <select className="input-base" value={form.answerType} onChange={(e) => setF({ answerType: e.target.value })} data-testid="admin-answer-type">
                {ANSWER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Year (optional)">
              <input className="input-base" type="number" min="1990" max="2099" value={form.year} onChange={(e) => setF({ year: e.target.value })} placeholder="e.g., 2023" />
            </Field>
            <Field label="Marks (optional)">
              <input className="input-base" type="number" min="1" max="30" value={form.marks} onChange={(e) => setF({ marks: e.target.value })} placeholder="e.g., 5" />
            </Field>
            <Field label="Reference link (optional)">
              <input className="input-base" type="url" value={form.link} onChange={(e) => setF({ link: e.target.value })} placeholder="https://example.com/paper.pdf" data-testid="admin-link" />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Question">
              <textarea className="input-base" rows={3} value={form.q} onChange={(e) => setF({ q: e.target.value })} placeholder={form.answerType === FULL_PAPER_TYPE ? 'Paper title, e.g. CBSE Class XII Physics 2025' : 'Type the past-paper question exactly as it appeared.'} data-testid="admin-question" />
            </Field>
          </div>

          {form.answerType === 'Multiple choice' && (
            <div className="mt-3">
              <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2">Options · click the radio to mark the correct one</div>
              <div className="flex flex-col gap-2">
                {form.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${form.a === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                    <input type="radio" name={`admin-correct-${syllabus}-${subject}`} checked={form.a === i} onChange={() => setF({ a: i })} />
                    <span className="text-[12px] font-semibold text-slate-500 w-5">{String.fromCharCode(65 + i)}.</span>
                    <input
                      className="flex-1 bg-transparent outline-none text-[13.5px] text-slate-900"
                      value={opt}
                      onChange={(e) => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setF({ options: opts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.answerType === 'Typed response' && (
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Expected answer">
                <input className="input-base" value={form.typedAnswer} onChange={(e) => setF({ typedAnswer: e.target.value })} placeholder="e.g., 9.8 m/s²" />
              </Field>
              <Field label="Accepted aliases (comma separated)">
                <input className="input-base" value={form.typedAliases} onChange={(e) => setF({ typedAliases: e.target.value })} placeholder="9.8, 9.81, 9.8 m/s^2" />
              </Field>
            </div>
          )}

          {form.answerType === 'Exam style' && (
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Model answer / mark scheme">
                <textarea className="input-base" rows={3} value={form.examAnswer} onChange={(e) => setF({ examAnswer: e.target.value })} placeholder="Model examiner answer describing what a full-mark response looks like." />
              </Field>
              <Field label="Required keywords (comma separated)">
                <input className="input-base" value={form.examKeywords} onChange={(e) => setF({ examKeywords: e.target.value })} placeholder="e.g., photosynthesis, chloroplast, sunlight, glucose" />
              </Field>
            </div>
          )}

          {form.answerType === 'Drawing' && (
            <div className="mt-3">
              <Field label="What the drawing must show">
                <textarea className="input-base" rows={2} value={form.examAnswer} onChange={(e) => setF({ examAnswer: e.target.value })} placeholder="e.g. Labelled ray diagram for a convex lens with the object beyond 2F: two rays, image position, arrows on rays." />
              </Field>
              <div className="text-[11.5px] text-slate-500 mt-1 inline-flex items-center gap-1"><PenTool className="w-3.5 h-3.5" /> Students can only answer this with a photo of their drawing — no typed answer.</div>
            </div>
          )}

          {form.answerType !== FULL_PAPER_TYPE && (
            <div className="mt-4">
              <MarkSchemeEditor value={form.markScheme} onChange={(v) => setF({ markScheme: v })} marks={form.marks} />
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            data-testid="admin-add-question"
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {busy ? 'Saving\u2026' : 'Add question'}
          </button>
        </div>

        <BulkPdfUpload syllabus={syllabus} subject={subject} addPastPaper={addPastPaper} />
      </div>

      {/* Right column: library */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[12px] tracking-[0.16em] uppercase font-semibold text-blue-700">Past-paper library</div>
            <div className="text-[12.5px] text-slate-500">{syllabus} · {subject} · {scopedPastPapers.length} total{filterTopic ? ` · ${filteredPastPapers.length} shown` : ''}</div>
          </div>
          <Filter className="w-5 h-5 text-slate-400" />
        </div>

        <select className="input-base mb-4" value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
          <option value="">All topics</option>
          {topicsList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {filteredPastPapers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-8 text-center text-[13px] text-slate-500 bg-slate-50/50">
            <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            {scopedPastPapers.length === 0 ? 'No past-paper questions in this category yet. Add one on the left, or bulk-import a PDF below.' : 'No questions match this filter.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[640px] overflow-auto pr-1">
            {filteredPastPapers.map((p) => (
              <LibraryRow key={p.id} p={p} onRemove={removePastPaper} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Library row
// --------------------------------------------------------------------------

function LibraryRow({ p, onRemove }) {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] p-3.5 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {p.topic && <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10.5px] font-semibold">{p.topic}</span>}
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold">{p.answerType}</span>
            {p.difficulty && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10.5px] font-semibold">{p.difficulty}</span>}
            {p.year && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-semibold">{p.year}</span>}
            {p.marks && <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10.5px] font-semibold">{p.marks} marks</span>}
          </div>
          <div className="text-[13.5px] font-medium text-slate-900 leading-snug">{p.q}</div>
          {p.answerType === 'Multiple choice' && Array.isArray(p.options) && (
            <div className="text-[12.5px] text-slate-600 mt-1">Correct: <span className="font-medium text-emerald-700">{p.options[p.a]}</span></div>
          )}
          {p.answerType === 'Typed response' && (
            <div className="text-[12.5px] text-slate-600 mt-1">Expected: <span className="font-medium text-emerald-700">{p.typedAnswer}</span></div>
          )}
          {p.answerType === 'Exam style' && (
            <div className="text-[12.5px] text-slate-600 mt-1 flex items-start gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Keywords: <span className="font-medium text-slate-800">{(p.examKeywords || []).join(', ') || '\u2014'}</span></span>
            </div>
          )}
          {p.answerType === 'Drawing' && (
            <div className="text-[12.5px] text-slate-600 mt-1 flex items-start gap-1.5">
              <PenTool className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <span>Photo answer only{p.examAnswer ? <> · <span className="font-medium text-slate-800">{p.examAnswer}</span></> : null}</span>
            </div>
          )}
          {Array.isArray(p.markScheme) && p.markScheme.length > 0 && (
            <div className="text-[12px] text-slate-600 mt-1.5 rounded-md bg-slate-50 border border-[color:var(--color-border)] px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 inline-flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Marking scheme · {schemeTotal(p.markScheme, p.marks)} marks</div>
              <ul className="list-disc pl-4 space-y-0.5">{p.markScheme.map((pt, k) => <li key={k}><span className="font-semibold">{pt.marks}</span> — {pt.point}</li>)}</ul>
            </div>
          )}
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-700 hover:text-blue-900 mt-1.5 inline-flex items-center gap-1 max-w-full">
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{p.link}</span>
            </a>
          )}
        </div>
        <button
          onClick={async () => {
            try { await onRemove(p.id); toast.success('Question removed'); }
            catch (e) { toast.error(e?.message || 'Could not remove question'); }
          }}
          className="w-8 h-8 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0"
          aria-label="Remove"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Bulk PDF upload → LLM extraction
// --------------------------------------------------------------------------

function BulkPdfUpload({ syllabus, subject, addPastPaper }) {
  const { state, refreshPastPapers } = useApp();
  const addedBy = state.user?.email || (state.user?.isDemo ? 'demo' : 'unknown');
  const [file, setFile] = useState(null);
  const [schemeFile, setSchemeFile] = useState(null);   // optional mark-scheme PDF
  const aiOn = isAiEnabled(state);
  const [year, setYear] = useState('');
  const [link, setLink] = useState('');
  const [autosave, setAutosave] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState([]); // list of question drafts
  const [savingAll, setSavingAll] = useState(false);

  const clear = () => { setFile(null); setSchemeFile(null); setExtracted([]); setYear(''); setLink(''); };

  // The AI reads the paper (and the mark scheme, when given) straight from
  // the PDF and returns question drafts with answers + marking schemes.
  const extract = async () => {
    if (!file) { toast.error('Choose a PDF first'); return; }
    if (!aiOn) { toast.error('AI is switched off in Settings — turn it on to scan the PDF.'); return; }
    if (!state.user?.isDemo && state.user?.role && state.user.role !== 'admin') { toast.error('Admin access is required to add to the question bank.'); return; }
    setUploading(true);
    try {
      const [paper] = await filesToAiParts([file]);
      const [scheme] = schemeFile ? await filesToAiParts([schemeFile]) : [null];
      const topics = TOPICS[subject] || [];
      const drafts = await extractFromPdf({ paper, scheme, board: syllabus, subject, topics });
      const list = drafts.map((q, i) => ({
        ...q,
        subject,
        board: syllabus,
        year: year ? parseInt(year, 10) : q.year || null,
        link: link.trim() || null,
        addedBy,
        source: 'past-paper',
        _draftId: `d_${Date.now()}_${i}`,
      }));
      if (!list.length) throw new Error('No complete questions were found in that PDF (MCQs without a known correct option are skipped — attach the mark scheme).');
      if (autosave) {
        let ok = 0;
        for (const d of list) {
          const { _draftId, ...payload } = d;
          try { await addPastPaper(payload); ok += 1; } catch (_) { /* counted below */ }
        }
        toast.success(`Scanned ${file.name}: ${list.length} question${list.length === 1 ? '' : 's'} · ${ok} saved to the ${subject} bank`);
        setExtracted([]);
        if (refreshPastPapers) await refreshPastPapers();
      } else {
        setExtracted(list);
        toast.success(`Scanned ${file.name}: ${list.length} question${list.length === 1 ? '' : 's'} found${scheme ? ' with marking schemes' : ''}. Review and save below.`);
      }
    } catch (e) {
      toast.error(e?.message || 'Extraction failed');
    } finally {
      setUploading(false);
    }
  };

  const patchDraft = (id, patch) => setExtracted((prev) => prev.map((d) => (d._draftId === id ? { ...d, ...patch } : d)));
  const dropDraft = (id) => setExtracted((prev) => prev.filter((d) => d._draftId !== id));

  const saveAll = async () => {
    if (extracted.length === 0) return;
    setSavingAll(true);
    let ok = 0, fail = 0;
    for (const draft of extracted) {
      // Strip internal fields.
      const { _draftId, ...payload } = draft;
      payload.addedBy = payload.addedBy || addedBy;
      // Ensure required fields per answer type.
      if (payload.answerType === 'Multiple choice' && (!payload.options || !payload.options.length)) continue;
      if (payload.answerType === 'Typed response' && !payload.typedAnswer) continue;
      if (payload.answerType === 'Exam style' && !payload.examAnswer) continue;
      try {
        await addPastPaper(payload);
        ok += 1;
      } catch (e) {
        fail += 1;
      }
    }
    setSavingAll(false);
    if (ok) toast.success(`Saved ${ok} question${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} question${fail === 1 ? '' : 's'} failed to save`);
    if (ok && !fail) setExtracted([]);
  };

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="admin-bulk-pdf">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[12px] tracking-[0.16em] uppercase font-semibold text-blue-700 inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Scan a PDF into the question bank</div>
        <span className="text-[11px] font-semibold text-slate-500">{syllabus} · {subject}</span>
      </div>
      <p className="text-[12.5px] text-slate-500 mb-4">Upload a past-paper PDF and the AI scans every complete question out of it into <span className="font-semibold">{subject}</span>, snapping each to a canonical topic. Add the official mark scheme too and each question gets its accepted answer and mark points from it. Review and save the ones you want, or flip on autosave.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Field label="Question paper (PDF)">
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
            <Upload className="w-5 h-5 text-slate-500" />
            <span className="text-[12.5px] text-slate-700 truncate flex-1">{file ? file.name : 'Choose a PDF\u2026'}</span>
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" data-testid="admin-pdf-file" />
          </label>
        </Field>
        <Field label="Mark scheme (PDF, optional)">
          <label className="flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 px-3 py-2 cursor-pointer hover:bg-emerald-50 transition-colors">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-[12.5px] text-slate-700 truncate flex-1">{schemeFile ? schemeFile.name : 'Add the marking scheme\u2026'}</span>
            {schemeFile && <button type="button" onClick={(e) => { e.preventDefault(); setSchemeFile(null); }} className="text-slate-400 hover:text-rose-600"><X className="w-4 h-4" /></button>}
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setSchemeFile(e.target.files?.[0] || null)} className="hidden" data-testid="admin-scheme-file" />
          </label>
        </Field>
        <Field label="Year (optional)">
          <input className="input-base" type="number" min="1990" max="2099" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g., 2023" />
        </Field>
        <Field label="Reference link (optional, attached to every question)">
          <input className="input-base" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com/paper.pdf" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span
            className={`w-9 h-5 rounded-full transition-colors relative ${autosave ? 'bg-blue-600' : 'bg-slate-300'}`}
            onClick={(e) => { e.preventDefault(); setAutosave(!autosave); }}
            role="button"
            aria-pressed={autosave}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autosave ? 'left-4' : 'left-0.5'}`} />
          </span>
          <input type="checkbox" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} className="sr-only" data-testid="admin-autosave" />
          <span className="text-[12.5px] font-medium text-slate-700">Save automatically <span className="text-slate-500 font-normal">(skip the review step)</span></span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={extract}
          disabled={!file || uploading}
          data-testid="admin-extract-btn"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {uploading ? (autosave ? 'Extracting & saving\u2026' : 'Extracting\u2026') : (autosave ? 'Extract & save all' : 'Extract questions')}
        </button>
        {(file || extracted.length > 0) && (
          <button onClick={clear} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-800">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {extracted.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12.5px] font-semibold text-slate-700">{extracted.length} extracted draft{extracted.length === 1 ? '' : 's'} · review before saving</div>
            <button
              onClick={saveAll}
              disabled={savingAll}
              data-testid="admin-save-all"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white bg-emerald-600 hover:opacity-95 disabled:opacity-50"
            >
              {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {savingAll ? 'Saving\u2026' : 'Save all'}
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[420px] overflow-auto pr-1">
            {extracted.map((d) => (
              <DraftRow key={d._draftId} draft={d} onChange={(patch) => patchDraft(d._draftId, patch)} onRemove={() => dropDraft(d._draftId)} subject={subject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft, onChange, onRemove, subject }) {
  const topicsList = TOPICS[subject] || [];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-semibold">{draft.answerType}</span>
          {draft.difficulty && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10.5px] font-semibold">{draft.difficulty}</span>}
          {draft.marks && <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10.5px] font-semibold">{draft.marks} marks</span>}
        </div>
        <button onClick={onRemove} className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0" aria-label="Discard">
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        rows={2}
        value={draft.q || ''}
        onChange={(e) => onChange({ q: e.target.value })}
        className="input-base w-full text-[13px] mb-2"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select className="input-base text-[12.5px]" value={draft.topic || ''} onChange={(e) => onChange({ topic: e.target.value })}>
          <option value="">Pick a topic</option>
          {topicsList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input-base text-[12.5px]" value={draft.difficulty || 'Medium'} onChange={(e) => onChange({ difficulty: e.target.value })}>
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {draft.answerType === 'Multiple choice' && Array.isArray(draft.options) && (
        <div className="flex flex-col gap-1">
          {draft.options.map((opt, i) => (
            <div key={i} className={`flex items-center gap-1.5 rounded border px-2 py-1 ${draft.a === i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <input type="radio" name={`draft-${draft._draftId}`} checked={draft.a === i} onChange={() => onChange({ a: i })} />
              <span className="text-[11px] font-semibold text-slate-500 w-4">{String.fromCharCode(65 + i)}.</span>
              <input
                className="flex-1 bg-transparent outline-none text-[12.5px] text-slate-900"
                value={opt}
                onChange={(e) => {
                  const opts = [...draft.options];
                  opts[i] = e.target.value;
                  onChange({ options: opts });
                }}
              />
            </div>
          ))}
        </div>
      )}
      {draft.answerType === 'Typed response' && (
        <input
          className="input-base w-full text-[12.5px]"
          value={draft.typedAnswer || ''}
          onChange={(e) => onChange({ typedAnswer: e.target.value })}
          placeholder="Expected typed answer"
        />
      )}
      {draft.answerType === 'Exam style' && (
        <div className="flex flex-col gap-1.5">
          <textarea
            rows={2}
            className="input-base w-full text-[12.5px]"
            value={draft.examAnswer || ''}
            onChange={(e) => onChange({ examAnswer: e.target.value })}
            placeholder="Model answer"
          />
          <input
            className="input-base w-full text-[12.5px]"
            value={(draft.examKeywords || []).join(', ')}
            onChange={(e) => onChange({ examKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="Required keywords, comma separated"
          />
        </div>
      )}
      {draft.answerType === 'Drawing' && (
        <textarea rows={2} className="input-base w-full text-[12.5px]" value={draft.examAnswer || ''} onChange={(e) => onChange({ examAnswer: e.target.value })} placeholder="What the drawing must show" />
      )}
      <div className="mt-2">
        <MarkSchemeEditor value={draft.markScheme || []} onChange={(v) => onChange({ markScheme: v })} marks={draft.marks} compact />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Field wrapper
// --------------------------------------------------------------------------

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}


// Examiner-style marking scheme: one line per mark point with its marks.
// Used by the single-question form and the bulk-import drafts.
export function MarkSchemeEditor({ value = [], onChange, marks, compact = false }) {
  const rows = Array.isArray(value) ? value : [];
  const total = schemeTotal(rows, 0);
  const set = (i, patch) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const add = () => onChange([...rows, { point: '', marks: 1 }]);
  const remove = (i) => onChange(rows.filter((_, k) => k !== i));
  return (
    <div className={`rounded-lg border border-[color:var(--color-border)] ${compact ? 'bg-white p-2.5' : 'bg-slate-50/60 p-3'}`} data-testid="mark-scheme-editor">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[11px] tracking-[0.14em] uppercase font-semibold text-slate-600 inline-flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-blue-600" /> Marking scheme
          <span className="font-normal normal-case tracking-normal text-slate-500">· {total} mark{total === 1 ? '' : 's'}{marks && Number(marks) !== total && total > 0 ? ` (question says ${marks})` : ''}</span>
        </div>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-700 hover:text-blue-900" data-testid="mark-scheme-add">
          <Plus className="w-4 h-4" /> Add mark point
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-slate-500">Optional but recommended: list what earns each mark (e.g. "1 — correct formula", "2 — substitution and answer with units"). The AI examiner marks student answers against these points.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input type="number" min="1" max="20" value={r.marks ?? 1} onChange={(e) => set(i, { marks: e.target.value })} className="input-base w-16 text-[12.5px] text-center" aria-label="Marks" />
              <input value={r.point || ''} onChange={(e) => set(i, { point: e.target.value })} placeholder={`Mark point ${i + 1} — what the student must show`} className="input-base flex-1 text-[12.5px]" />
              <button type="button" onClick={() => remove(i)} className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0" aria-label="Remove mark point"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
