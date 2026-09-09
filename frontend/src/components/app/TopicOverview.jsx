import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Sparkles, RefreshCw, Loader2, FileText, Link2, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { subjectBoards, boardName } from '../../lib/subjects';
import { topicOverview, isAiEnabled } from '../../lib/ai';
import { topicLinks } from '../../data/topicLinks';
import CreateWorksheetButton from './CreateWorksheetButton';
import AiChat, { MarkdownLite } from './ai/AiChat';

/**
 * Topic page: what the exam wants for this topic (AI overview), a doubt-clearing
 * assistant that knows the board's requirements, source links, past-paper
 * questions tagged with the topic, and the student's own attempts.
 * Route: #topic?subject=<subject>&topic=<topic>
 */
export default function TopicOverview({ subject, topic, go }) {
  const { state } = useApp();
  const examTrack = state.user?.examTrack || 'CBSE';
  const boards = useMemo(() => subjectBoards(state.courses, examTrack), [state.courses, examTrack]);
  const board = boards[subject]?.board || examTrack;
  const ibLevel = boards[subject]?.ibLevel;
  const context = useMemo(() => ({ board, subject, topic, ibLevel }), [board, subject, topic, ibLevel]);

  const attempts = useMemo(() => (state.worksheets || []).filter((w) => w.subject === subject && w.topic === topic), [state.worksheets, subject, topic]);
  const acc = useMemo(() => {
    const total = attempts.reduce((s, w) => s + (w.total || 0), 0);
    const correct = attempts.reduce((s, w) => s + (w.correct || 0), 0);
    return total ? Math.round((correct / total) * 100) : null;
  }, [attempts]);
  const best = attempts.reduce((m, w) => (w.score > (m?.score ?? -1) ? w : m), null);

  const papers = useMemo(
    () => (state.pastPapers || []).filter((p) => p.subject === subject && p.topic === topic && (!p.board || p.board === board) && p.answerType !== 'Full paper'),
    [state.pastPapers, subject, topic, board],
  );
  const links = useMemo(() => topicLinks({ board, subject, topic }), [board, subject, topic]);

  const launch = () => {
    window.sessionStorage.setItem('preselect_subject', subject);
    window.sessionStorage.setItem('preselect_topic', topic);
    go('worksheets');
  };
  const back = () => { window.location.hash = `#study?subject=${encodeURIComponent(subject)}`; };

  if (!subject || !topic) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white p-10 text-center text-[13.5px] text-slate-500">
        Pick a topic from a subject page to open its overview.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="topic-overview">
      <button onClick={back} data-testid="topic-back" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to {subject}
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.12em] uppercase font-semibold text-blue-700">
            <span data-testid="topic-board">{boardName(board)}</span>
            {ibLevel && <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 tracking-normal">{ibLevel}</span>}
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 normal-case tracking-normal font-medium">{subject}</span>
          </div>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-slate-900 mt-1.5" data-testid="topic-title">{topic}</h1>
          <div className="text-[13px] text-slate-500 mt-1.5">
            {acc !== null
              ? <>Your accuracy <span className="font-semibold text-slate-800">{acc}%</span> across {attempts.length} worksheet{attempts.length === 1 ? '' : 's'}{best ? <> · best <span className="font-semibold text-slate-800">{best.score}%</span></> : null}</>
              : 'Not attempted yet — start with a worksheet or read the overview below.'}
          </div>
        </div>
        <CreateWorksheetButton onClick={launch} data-testid="topic-create-worksheet" />
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
        {/* Left: AI overview + doubts */}
        <div className="flex flex-col gap-5 min-w-0">
          <Overview context={context} />
          <AiChat
            title="Ask a doubt"
            subtitle={`Knows what ${boardName(board)} examiners want for ${topic}.`}
            context={context}
            suggestions={[
              'Explain this topic simply',
              'What exactly do I need to write to get full marks?',
              'Give me a typical exam question and a model answer',
              'What are the most common mistakes here?',
            ]}
            placeholder={`Ask anything about ${topic}…`}
            testid="topic-chat"
          />
        </div>

        {/* Right: sources, past-paper questions, attempts */}
        <div className="flex flex-col gap-5 min-w-0">
          <div className="card-soft p-5" data-testid="topic-links">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><Link2 className="w-5 h-5" /></span>
              <h3 className="text-[15px] font-semibold text-slate-900">Learn it elsewhere</h3>
            </div>
            <ul className="flex flex-col gap-1.5">
              {links.general.map((l) => <LinkRow key={l.title} l={l} />)}
            </ul>
            {links.official.length > 0 && (
              <>
                <div className="text-[11px] tracking-[0.12em] uppercase font-semibold text-slate-500 mt-4 mb-2">{links.boardName} sources</div>
                <ul className="flex flex-col gap-1.5">
                  {links.official.map((l) => <LinkRow key={l.url + l.title} l={l} />)}
                </ul>
                {links.note && <p className="mt-2 text-[11.5px] text-slate-500">{links.note}</p>}
              </>
            )}
          </div>

          <div className="card-soft p-5" data-testid="topic-past-papers">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><FileText className="w-5 h-5" /></span>
              <h3 className="text-[15px] font-semibold text-slate-900">Past-paper questions on this topic</h3>
            </div>
            {papers.length === 0 ? (
              <p className="text-[13px] text-slate-500">None tagged yet. Tick <span className="font-medium">Past paper questions</span> in the worksheet builder as more are added.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {papers.slice(0, 5).map((p) => (
                  <li key={p.id} className="rounded-lg border border-[color:var(--color-border)] px-3 py-2">
                    <div className="text-[13px] text-slate-800 leading-snug">{p.q}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{p.answerType}{p.difficulty ? ` · ${p.difficulty}` : ''}{p.year ? ` · ${p.year}` : ''}</div>
                  </li>
                ))}
                {papers.length > 5 && <li className="text-[12px] text-slate-500">+{papers.length - 5} more in the worksheet builder.</li>}
              </ul>
            )}
            {papers.length > 0 && (
              <button onClick={launch} className="mt-3 text-[12.5px] font-medium text-blue-700 hover:underline">Practise these in a worksheet →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({ l }) {
  return (
    <li>
      <a href={l.url} target="_blank" rel="noopener noreferrer"
        className="group flex items-start gap-2 rounded-lg border border-[color:var(--color-border)] px-3 py-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-medium text-slate-900 leading-snug">{l.title}</span>
          {l.desc && <span className="block text-[11.5px] text-slate-500 mt-0.5 leading-snug">{l.desc}</span>}
        </span>
        <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-600 mt-0.5" />
      </a>
    </li>
  );
}

// AI "what the exam wants" overview, cached per session; regenerable.
function Overview({ context }) {
  const { state } = useApp();
  const enabled = isAiEnabled(state);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    setBusy(true); setError(null);
    try { setText(await topicOverview(context, { force })); }
    catch (e) { setError(e.message || 'Could not load the overview.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!enabled) return;
    setText('');
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.board, context.subject, context.topic, context.ibLevel, enabled]);

  return (
    <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5 sm:p-6" data-testid="topic-ai-overview">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center"><Sparkles className="w-5 h-5" /></span>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">What the exam wants</h3>
            <div className="text-[12px] text-slate-500">AI overview tuned to {boardName(context.board)} mark schemes.</div>
          </div>
        </div>
        {enabled && (
          <button onClick={() => load(true)} disabled={busy} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50" data-testid="topic-ai-regenerate">
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Regenerate
          </button>
        )}
      </div>
      {!enabled ? (
        <p className="text-[13px] text-slate-600">AI overviews are off. <a href="#settings" className="text-blue-700 font-medium hover:underline inline-flex items-center gap-1"><SettingsIcon className="w-3.5 h-3.5" />Turn on in Settings</a></p>
      ) : busy && !text ? (
        <div className="inline-flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Reading the syllabus for {context.topic}…</div>
      ) : error ? (
        <div className="text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2" role="alert">{error}</div>
      ) : (
        <MarkdownLite text={text} />
      )}
    </div>
  );
}
