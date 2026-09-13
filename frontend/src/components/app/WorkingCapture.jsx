import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, ScanText, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { prepareImage } from '../../lib/images';
import { transcribeWorking, isAiEnabled } from '../../lib/ai';
import { useApp } from '../../context/AppContext';

const MAX_PHOTOS = 3;

/**
 * Photo capture for a question's handwritten working. The student snaps or
 * uploads a page; the AI transcribes it so the diagnosis (and the marker)
 * can see the actual steps, not just the final answer.
 *
 *   value     — { images: [{ thumb, full? }], transcript, transcribedAt } | undefined
 *   onChange  — (nextValue) => void
 *   question  — the question object (for the transcription prompt)
 *   required  — Drawing questions: the photo IS the answer
 *   readOnly  — result / history view
 */
export default function WorkingCapture({ value, onChange, question, subject, board, required = false, readOnly = false, testid = 'working' }) {
  const { state } = useApp();
  const aiOn = isAiEnabled(state);
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const images = value?.images || [];

  const addFiles = async (files) => {
    const list = Array.from(files || []).slice(0, MAX_PHOTOS - images.length);
    if (!list.length) { if (images.length >= MAX_PHOTOS) toast.error(`Up to ${MAX_PHOTOS} photos per question`); return; }
    setBusy(true);
    try {
      const prepared = [];
      for (const f of list) prepared.push(await prepareImage(f));
      onChange({ ...(value || {}), images: [...images, ...prepared.map((p) => ({ thumb: p.thumb, full: p.full }))], transcript: null, transcribedAt: null });
    } catch (e) {
      toast.error(e.message || 'Could not read that photo');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      if (camRef.current) camRef.current.value = '';
    }
  };

  const remove = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    onChange({ ...(value || {}), images: next, transcript: next.length ? value?.transcript : null });
  };

  const transcribe = async () => {
    const fulls = images.map((i) => i.full || i.thumb).filter(Boolean);
    if (!fulls.length) return;
    setBusy(true);
    try {
      const text = await transcribeWorking({ images: fulls, question: question?.q, subject, board });
      onChange({ ...(value || {}), images, transcript: text, transcribedAt: new Date().toISOString() });
      toast.success('Working transcribed');
    } catch (e) {
      toast.error(e.message || 'Could not transcribe the photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-slate-50/60 p-3" data-testid={testid}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[12.5px] font-semibold text-slate-800 inline-flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-slate-500" />
          {required ? 'Your drawing' : 'Your working'}
          <span className="text-[11px] font-normal text-slate-500">{required ? '· photo only' : '· optional'}</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <button type="button" disabled={busy || images.length >= MAX_PHOTOS} onClick={() => camRef.current?.click()} className="btn-outline-dark inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium disabled:opacity-40" data-testid={`${testid}-camera`}>
              <Camera className="w-4 h-4" /> Scan page
            </button>
            <button type="button" disabled={busy || images.length >= MAX_PHOTOS} onClick={() => fileRef.current?.click()} className="btn-outline-dark inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium disabled:opacity-40" data-testid={`${testid}-upload`}>
              <ImagePlus className="w-4 h-4" /> Upload
            </button>
          </div>
        )}
      </div>

      {images.length === 0 ? (
        <div className="text-[12px] text-slate-500">
          {required
            ? 'This question needs a drawn answer. Draw it on paper, then scan or upload a photo — typing is disabled.'
            : 'Photograph your working on paper so the AI can check your steps, not just the final answer.'}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((im, i) => (
            <div key={i} className="relative group">
              <button type="button" onClick={() => setPreview(im.full || im.thumb)} className="block rounded-lg overflow-hidden border border-[color:var(--color-border)] bg-white">
                <img src={im.thumb} alt={`Working page ${i + 1}`} className="h-24 w-auto object-cover" />
              </button>
              {!readOnly && (
                <button type="button" onClick={() => remove(i)} title="Remove" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-2.5">
          {value?.transcript ? (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1 inline-flex items-center gap-1"><ScanText className="w-3.5 h-3.5" /> Transcribed working</div>
              <pre className="text-[12.5px] text-slate-700 whitespace-pre-wrap font-sans bg-white rounded-lg border border-[color:var(--color-border)] p-2.5 max-h-48 overflow-auto" data-testid={`${testid}-transcript`}>{value.transcript}</pre>
            </div>
          ) : !readOnly && (
            aiOn ? (
              <button type="button" onClick={transcribe} disabled={busy} className="btn-violet inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold disabled:opacity-60" data-testid={`${testid}-transcribe`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />} Transcribe with AI
              </button>
            ) : <div className="text-[11.5px] text-slate-500">Turn AI on in Settings to transcribe the photo.</div>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button type="button" className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setPreview(null)}><X className="w-6 h-6" /></button>
          <img src={preview} alt="Working page" className="max-h-full max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
