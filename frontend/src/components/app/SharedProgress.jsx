import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import { fetchSharedProgress } from '../../lib/dataStore';
import { predictedScore, formatGrade } from '../../lib/predictedGrade';

// Read-only progress page for a teacher or parent: #shared?token=… . Only
// what `shared_progress()` returns (summary numbers, never answers/emails).
export default function SharedProgress({ token }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!token) { setData(null); return; }
    fetchSharedProgress(token).then(setData).catch(() => setData(null));
  }, [token]);

  const boardOf = useMemo(() => {
    const m = {};
    (data?.courses || []).forEach((c) => (c.subjects || []).forEach((e) => { const n = typeof e === 'string' ? e : e?.subject; if (n && !m[n]) m[n] = c.exam; }));
    return (s) => m[s] || data?.examTrack;
  }, [data]);
  const bySubject = useMemo(() => {
    if (!data) return [];
    const m = {};
    (data.worksheets || []).forEach((w) => {
      const s = m[w.subject] || (m[w.subject] = { subject: w.subject, sheets: [], questions: 0, correct: 0 });
      s.sheets.push(w); s.questions += w.total || 0; s.correct += w.correct || 0;
    });
    return Object.values(m).map((s) => ({ ...s, predicted: predictedScore(s.sheets), accuracy: s.questions ? Math.round((s.correct / s.questions) * 100) : 0 })).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [data]);

  const weakTopics = useMemo(() => {
    if (!data) return [];
    const t = {};
    (data.worksheets || []).forEach((w) => (w.questions || []).forEach((q, i) => {
      const k = `${w.subject} · ${q?._topic || w.topic}`;
      const e = t[k] || (t[k] = { k, n: 0, ok: 0 });
      e.n += 1; if (w.results?.[i]) e.ok += 1;
    }));
    return Object.values(t).filter((e) => e.n >= 4).map((e) => ({ ...e, acc: Math.round((e.ok / e.n) * 100) })).sort((a, b) => a.acc - b.acc).slice(0, 5);
  }, [data]);

  if (data === undefined) return <div className="min-h-screen section-bg flex items-center justify-center text-slate-500 text-[14px]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  if (!data) {
    return (
      <div className="min-h-screen section-bg flex items-center justify-center p-6">
        <div className="max-w-[420px] rounded-2xl border border-[color:var(--color-border)] bg-white p-8 text-center" data-testid="shared-invalid">
          <div className="text-[17px] font-semibold text-slate-900">This link is no longer active</div>
          <div className="text-[13px] text-slate-500 mt-1">The student may have revoked it. Ask them for a new link from Settings → Share progress.</div>
          <a href="#top" className="btn-violet inline-block mt-5 px-4 py-2 rounded-lg text-[13.5px] font-medium">Go to InfinitySheets</a>
        </div>
      </div>
    );
  }
  const last14 = (data.worksheets || []).filter((w) => Date.now() - new Date(w.date).getTime() < 14 * 24 * 3600 * 1000);
  return (
    <div className="min-h-screen section-bg">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8" data-testid="shared-progress">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="eyebrow-muted mb-1 inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Read-only progress report</div>
            <h1 className="text-[24px] font-semibold tracking-tight text-slate-900">{data.name}{data.examTrack ? <span className="text-slate-500 font-normal"> · {data.examTrack}</span> : null}</h1>
          </div>
          <a href="#top" className="text-[13px] text-violet-700 hover:text-violet-900">InfinitySheets</a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[['Streak', `${data.streak || 0} days`], ['Worksheets', (data.worksheets || []).length], ['Last 14 days', `${last14.length} sheets`], ['Questions', (data.worksheets || []).reduce((s, w) => s + (w.total || 0), 0)]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[color:var(--color-border)] bg-white p-4"><div className="text-[11px] uppercase tracking-wide text-slate-500">{k}</div><div className="text-[20px] font-semibold text-slate-900 mt-0.5">{v}</div></div>
          ))}
        </div>
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5 mb-5">
          <div className="text-[15px] font-semibold text-slate-900 mb-3 inline-flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> By subject</div>
          {bySubject.length === 0 ? <div className="text-[13px] text-slate-500">No worksheets yet.</div> : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {bySubject.map((s) => { const g = formatGrade(s.predicted, boardOf(s.subject)); return (
                <div key={s.subject} className="rounded-xl border border-[color:var(--color-border)] px-4 py-3">
                  <div className="flex items-center justify-between"><div className="text-[14px] font-semibold text-slate-900">{s.subject}</div><div className={`text-[13px] font-semibold ${g.tone === 'good' ? 'text-emerald-700' : g.tone === 'ok' ? 'text-amber-700' : 'text-rose-700'}`}>{g.label}</div></div>
                  <div className="text-[12px] text-slate-500 mt-0.5">{boardOf(s.subject) || ''} · {s.sheets.length} sheets · {s.accuracy}% accuracy · {g.sub}</div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2"><div className="h-full bg-violet-500" style={{ width: `${s.accuracy}%` }} /></div>
                </div>
              ); })}
            </div>
          )}
        </div>
        {weakTopics.length > 0 && (
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5 mb-5">
            <div className="text-[15px] font-semibold text-slate-900 mb-2">Topics needing attention</div>
            <ul className="space-y-1.5">{weakTopics.map((t) => <li key={t.k} className="flex items-center justify-between text-[13px]"><span className="text-slate-700">{t.k}</span><span className="text-rose-700 font-semibold tabular-nums">{t.acc}%</span></li>)}</ul>
          </div>
        )}
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5">
          <div className="text-[15px] font-semibold text-slate-900 mb-2">Recent worksheets</div>
          <div className="divide-y divide-[color:var(--color-border)]">
            {(data.worksheets || []).slice(0, 15).map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 text-[13px]"><span className="text-slate-700 truncate mr-3">{w.subject} · {w.topic} <span className="text-slate-400">· {w.difficulty}</span></span><span className="text-slate-500 shrink-0">{new Date(w.date).toLocaleDateString()} · <span className="font-semibold text-slate-800">{w.score}%</span></span></div>
            ))}
          </div>
        </div>
        <div className="text-[11.5px] text-slate-500 mt-6">This page shows scores and topics only. It never includes the student's answers, photos or email address. The student can revoke the link at any time.</div>
      </div>
    </div>
  );
}
