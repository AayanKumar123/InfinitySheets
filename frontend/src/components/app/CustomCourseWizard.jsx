import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Upload, FileText, Sparkles, Loader2, Plus, Trash2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CustomCourseWizard
 * -----------------------------------------------------------------------------
 * Lets the user create a course from their own syllabus files (lectures, PDFs,
 * past tests, etc.). Currently this is a PURE PLACEHOLDER — no AI is invoked.
 * Every spot that will eventually call an LLM / extraction pipeline is marked
 * with a `// PLACEHOLDER:` comment so the wiring is obvious later.
 * -----------------------------------------------------------------------------
 */

// PLACEHOLDER: replace with real topic extraction from the uploaded documents
// once the AI pipeline is wired up. For now we derive fake topic labels from
// the filenames (minus extensions) so the flow is testable end-to-end.
function placeholderTopicsFromFiles(files) {
  if (!files || files.length === 0) {
    return ['Overview', 'Key concepts', 'Practice problems'];
  }
  const seen = new Set();
  const topics = [];
  for (const f of files) {
    const bare = (f.name || 'Untitled')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const label = bare.charAt(0).toUpperCase() + bare.slice(1);
    if (!seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      topics.push(label);
    }
  }
  return topics.length ? topics : ['Overview', 'Key concepts'];
}

// PLACEHOLDER: replace with real per-topic summaries from the AI pipeline.
function placeholderSummaryForTopic(topic, file) {
  const src = file?.name ? ` (from ${file.name})` : '';
  return `Placeholder summary for “${topic}”${src}. Once the AI pipeline is enabled, this will be a short overview extracted from your uploaded material.`;
}

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.md,image/*';

export default function CustomCourseWizard({ onClose, onCreated }) {
  const { addCourse } = useApp();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const onPickFiles = (list) => {
    if (!list) return;
    const newOnes = Array.from(list).map((f) => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified }));
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.name + '|' + p.size));
      return [...prev, ...newOnes.filter((f) => !seen.has(f.name + '|' + f.size))];
    });
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit = name.trim().length > 0 && subject.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) {
      toast.error('Give the course a name and a subject');
      return;
    }
    setBusy(true);
    try {
      // PLACEHOLDER: this is where we would upload the files to the backend and
      // kick off the AI extraction pipeline. Right now we simulate a short
      // processing delay and generate fake topics + summaries locally.
      await new Promise((r) => setTimeout(r, 700));
      const topics = placeholderTopicsFromFiles(files);
      const summaries = {};
      topics.forEach((t, i) => {
        summaries[t] = placeholderSummaryForTopic(t, files[i]);
      });
      const courseId = `c_${Date.now()}`;
      addCourse({
        id: courseId,
        name: name.trim(),
        exam: 'Custom',
        custom: true,
        description: description.trim() || null,
        // The custom course carries topics + summaries on the subject entry so
        // CourseOverview / Worksheets can use them without touching the global
        // TOPICS map.
        subjects: [{
          subject: subject.trim(),
          examDate: null,
          target: 'Medium',
          level: null,
          topics,
          topicSummaries: summaries,
        }],
        files, // metadata only — the file blobs never leave the browser here
        status: 'Active',
      });
      toast.success(`${name.trim()} added — course overview ready`);
      // Lets a parent (e.g. the onboarding wizard) finish its own flow.
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
        <div className="sticky top-0 bg-white border-b border-[color:var(--color-border)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.16em] uppercase font-semibold text-blue-600">Custom Course</div>
              <div className="text-[16px] font-semibold text-slate-900">Build a course from your own material</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[12.5px] text-blue-900 leading-snug">
              Upload your lectures, PDFs, and past tests. We&apos;ll turn them into a course overview with topics and summaries.
              <span className="block text-blue-800/70 mt-0.5"><b>Placeholder:</b> the AI extraction pipeline isn&apos;t wired up yet, so topics and summaries are auto-generated from your filenames for now.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Course name">
              <input
                className="input-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., IB HL Chemistry — Term 2"
                data-testid="cc-name"
              />
            </Field>
            <Field label="Subject">
              <input
                className="input-base"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Chemistry, Data Structures, Music Theory"
                data-testid="cc-subject"
              />
            </Field>
          </div>

          <Field label="Short description (optional)">
            <textarea
              className="input-base"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this course about? Any goals or context."
            />
          </Field>

          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2">Syllabus & study material</div>
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); onPickFiles(e.dataTransfer.files); }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50/60' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'}`}
              data-testid="cc-dropzone"
            >
              <Upload className="w-6 h-6 text-slate-500" />
              <div className="text-[13px] text-slate-700 font-medium">Drop files here or click to browse</div>
              <div className="text-[11.5px] text-slate-500">PDF, DOCX, PPTX, TXT, MD, images — as many as you like.</div>
              <input
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={(e) => onPickFiles(e.target.files)}
                data-testid="cc-file-input"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-[12.5px] font-medium text-slate-800 truncate">{f.name}</span>
                      <span className="text-[11px] text-slate-500 shrink-0">{Math.max(1, Math.round((f.size || 0) / 1024))} KB</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0" aria-label="Remove file">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[color:var(--color-border)] px-6 py-4 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-slate-500">{files.length} file{files.length === 1 ? '' : 's'} attached</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3.5 py-2 rounded-md text-[13px] font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
            <button
              onClick={submit}
              disabled={!canSubmit || busy}
              data-testid="cc-submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {busy ? 'Building course\u2026' : 'Create custom course'}
            </button>
          </div>
        </div>
      </div>
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
