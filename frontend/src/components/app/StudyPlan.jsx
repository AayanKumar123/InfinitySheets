import React, { useMemo, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { buildStudyPlan, isAiEnabled } from '../../lib/ai';
import { enrolledSubjects, primaryTrack, subjectBoards } from '../../lib/subjects';
import { track } from '../../lib/analytics';

// AI study plan for the week: weakest topics first, spaced reviews later,
// tasks tick off and persist with the student's settings.
export default function StudyPlan({ weaknesses = [], go }) {
  const { state, setStudyPlan, togglePlanTask } = useApp();
  const [busy, setBusy] = useState(false);
  const plan = state.studyPlan;
  const aiOn = isAiEnabled(state);
  const subjects = useMemo(() => enrolledSubjects(state.courses, state.user?.subjects, state.user?.examTrack), [state.courses, state.user?.subjects, state.user?.examTrack]);
  const stale = plan?.createdAt && Date.now() - new Date(plan.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;

  const generate = async () => {
    setBusy(true);
    try {
      const weak = [...weaknesses].sort((a, b) => a.acc - b.acc).slice(0, 6).map((t) => ({ subject: t.subject, topic: t.topic, accuracy: t.acc }));
      const p = await buildStudyPlan({
        board: primaryTrack(state.courses, state.user?.examTrack),
        boards: subjectBoards(state.courses, primaryTrack(state.courses, state.user?.examTrack)),
        examDate: state.settings?.examDate,
        frequency: state.settings?.frequency,
        weeklyGoal: state.settings?.weeklyGoal,
        weakTopics: weak,
        subjects,
        startDate: new Date().toISOString().slice(0, 10),
      });
      setStudyPlan({ ...p, createdAt: new Date().toISOString() });
      track('study_plan_generated', { tasks: p.days.reduce((s, d) => s + d.tasks.length, 0) });
      toast.success('Your plan for the week is ready');
    } catch (e) { toast.error(e.message || 'Could not build a plan'); }
    finally { setBusy(false); }
  };

  const done = plan ? plan.days.reduce((s, d) => s + d.tasks.filter((t) => t.done).length, 0) : 0;
  const total = plan ? plan.days.reduce((s, d) => s + d.tasks.length, 0) : 0;

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5" data-testid="study-plan">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow-muted mb-0.5">This week's plan</div>
          <div className="text-[15px] font-semibold text-slate-900 inline-flex items-center gap-2"><CalendarDays className="w-4 h-4 text-violet-600" /> {plan ? `${done}/${total} tasks done` : 'Let the AI plan your week'}</div>
          {plan?.summary && <div className="text-[12.5px] text-slate-600 mt-1">{plan.summary}</div>}
          {stale && <div className="text-[11.5px] text-amber-700 mt-1">This plan is over a week old — regenerate it for the coming week.</div>}
        </div>
        {aiOn ? (
          <button onClick={generate} disabled={busy} className={`${plan ? 'btn-outline-dark' : 'btn-violet'} inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium disabled:opacity-60`} data-testid="study-plan-generate">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {plan ? 'Regenerate' : 'Build my plan'}
          </button>
        ) : <div className="text-[12px] text-slate-500">Turn on the AI in Settings to build a plan.</div>}
      </div>
      {plan && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {plan.days.map((d, di) => (
            <div key={di} className="rounded-xl border border-[color:var(--color-border)] bg-slate-50/60 p-3">
              <div className="text-[12px] font-semibold text-slate-800 mb-1.5">{d.day}{d.date ? <span className="font-normal text-slate-500"> · {d.date.slice(5)}</span> : null}</div>
              <ul className="space-y-1.5">
                {d.tasks.map((t, ti) => (
                  <li key={ti} className="flex items-start gap-2">
                    <button type="button" onClick={() => togglePlanTask(di, ti)} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300'}`} data-testid={`plan-task-${di}-${ti}`}>{t.done && <Check className="w-3 h-3" />}</button>
                    <button type="button" onClick={() => { try { window.sessionStorage.setItem('preselect_subject', t.subject); window.sessionStorage.setItem('preselect_topic', t.topic); } catch (e) { /* ignore */ } go('worksheets'); }} className={`text-left text-[12px] leading-snug ${t.done ? 'line-through text-slate-400' : 'text-slate-700 hover:text-violet-800'}`}>
                      <span className="font-medium">{t.topic}</span> <span className="text-slate-500">· {t.subject} · {t.minutes} min</span>
                      <span className="block text-slate-500">{t.what}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
