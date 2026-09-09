import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { askAi, isAiEnabled } from '../../../lib/ai';

// ---------------------------------------------------------------------------
// Tiny Markdown renderer — headings, bullets, numbered lists, bold, paragraphs.
// Enough for tutor-style answers without pulling in a library.
// ---------------------------------------------------------------------------
function inline(text, key) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${key}-${i}`} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={`${key}-${i}`} className="px-1 rounded bg-slate-100 text-[0.92em]">{p.slice(1, -1)}</code>;
    return <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>;
  });
}

export function MarkdownLite({ text, className = '' }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }
  const flush = () => {
    if (!list) return;
    const Tag = list.type;
    out.push(
      <Tag key={`l${out.length}`} className={`${list.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 flex flex-col gap-1 my-1.5`}>
        {list.items.map((it, i) => <li key={i} className="leading-relaxed">{inline(it, `li${out.length}-${i}`)}</li>)}
      </Tag>,
    );
    list = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (h) { flush(); out.push(<div key={i} className="text-[13px] font-semibold text-slate-900 mt-3 first:mt-0 mb-1">{inline(h[2], `h${i}`)}</div>); return; }
    if (ul) { if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; } list.items.push(ul[1]); return; }
    if (ol) { if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; } list.items.push(ol[1]); return; }
    flush();
    if (line.trim()) out.push(<p key={i} className="leading-relaxed my-1">{inline(line, `p${i}`)}</p>);
  });
  flush();
  return <div className={`text-[13.5px] text-slate-700 ${className}`}>{out}</div>;
}

// ---------------------------------------------------------------------------
// Chat panel
// ---------------------------------------------------------------------------

/**
 * Reusable assistant panel.
 *   context      — { board, subject, topic, ibLevel, ... } sent with every turn
 *   mode         — 'chat' (default) or 'recommend'
 *   intro        — first assistant bubble (not sent to the model)
 *   primer       — hidden first user message carrying data (e.g. performance)
 *   suggestions  — quick-start chips
 */
export default function AiChat({ title = 'Ask a doubt', subtitle, context = {}, mode = 'chat', intro, primer, suggestions = [], placeholder = 'Ask anything about this topic…', testid = 'ai-chat', className = '' }) {
  const { state } = useApp();
  const enabled = isAiEnabled(state);
  const [messages, setMessages] = useState([]); // only real turns; intro is separate
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    setError(null);
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setBusy(true);
    try {
      const history = primer ? [{ role: 'user', content: primer }, { role: 'assistant', content: intro || 'Understood.' }, ...next] : next;
      const reply = await askAi({ mode, context, messages: history });
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setMessages(next); // keep the question so they can retry
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className={`rounded-2xl border border-[color:var(--color-border)] bg-white flex flex-col ${className}`} data-testid={testid}>
      <div className="px-5 pt-4 pb-3 border-b border-[color:var(--color-border)] flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-[12.5px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>

      {!enabled ? (
        <div className="p-5 text-[13px] text-slate-600 flex flex-col gap-3" data-testid={`${testid}-disabled`}>
          <p>AI assistants are turned off in your settings.</p>
          <a href="#settings" className="inline-flex items-center gap-1.5 text-blue-700 font-medium hover:underline w-fit">
            <SettingsIcon className="w-4 h-4" /> Turn them back on in Settings
          </a>
        </div>
      ) : (
        <>
          <div ref={listRef} className="px-5 py-4 flex flex-col gap-3 max-h-[440px] overflow-y-auto" aria-live="polite">
            {intro && (
              <div className="self-start max-w-[92%] rounded-2xl rounded-tl-md bg-slate-50 border border-slate-100 px-4 py-2.5">
                <MarkdownLite text={intro} />
              </div>
            )}
            {messages.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="self-end max-w-[88%] rounded-2xl rounded-tr-md bg-blue-600 text-white px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap">{m.content}</div>
              ) : (
                <div key={i} className="self-start max-w-[92%] rounded-2xl rounded-tl-md bg-slate-50 border border-slate-100 px-4 py-2.5">
                  <MarkdownLite text={m.content} />
                </div>
              )
            ))}
            {busy && (
              <div className="self-start inline-flex items-center gap-2 text-[12.5px] text-slate-500 px-1">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            )}
            {error && (
              <div className="self-start text-[12.5px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2" role="alert">{error}</div>
            )}
          </div>

          {suggestions.length > 0 && messages.length === 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={busy}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50/60 hover:bg-violet-100 transition-colors disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="px-4 pb-4 pt-1 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={placeholder}
              className="input-base flex-1 resize-none min-h-[42px] max-h-[140px]"
              data-testid={`${testid}-input`}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
              className="btn-violet w-[42px] h-[42px] rounded-lg inline-flex items-center justify-center disabled:opacity-50 shrink-0"
              data-testid={`${testid}-send`}>
              <Send className="w-5 h-5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
