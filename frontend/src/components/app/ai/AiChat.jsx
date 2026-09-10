import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { askAi, isAiEnabled } from '../../../lib/ai';

// ---------------------------------------------------------------------------
// Tiny Markdown renderer — headings, bullets, numbered lists, bold, paragraphs.
// Enough for tutor-style answers without pulling in a library.
// ---------------------------------------------------------------------------
function inline(text, key) {
  // **bold** first, then *italic* and `code`. Models use single-asterisk
  // emphasis often enough that leaving it unhandled shows raw asterisks.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={`${key}-${i}`} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return <em key={`${key}-${i}`} className="italic">{p.slice(1, -1)}</em>;
    }
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
      return <code key={`${key}-${i}`} className="px-1 rounded bg-slate-100 text-[0.92em]">{p.slice(1, -1)}</code>;
    }
    return <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>;
  });
}

// Models slip into LaTeX for maths and science even when told not to. This view
// renders plain text, so unwrap the common constructs rather than showing a
// student a raw "$F = \frac{\Delta p}{t}$".
const GREEK = {
  Delta: '\u0394', delta: '\u03b4', alpha: '\u03b1', beta: '\u03b2', gamma: '\u03b3',
  theta: '\u03b8', lambda: '\u03bb', mu: '\u03bc', pi: '\u03c0', rho: '\u03c1',
  sigma: '\u03c3', omega: '\u03c9', Omega: '\u03a9',
};
const SYMBOLS = {
  times: '\u00d7', cdot: '\u00b7', div: '\u00f7', pm: '\u00b1', leq: '\u2264',
  geq: '\u2265', neq: '\u2260', approx: '\u2248', rightarrow: '\u2192',
  to: '\u2192', infty: '\u221e', degree: '\u00b0', circ: '\u00b0',
};

export function deLatex(input) {
  let t = String(input || '');
  if (!/[$\\]/.test(t)) return t;                                  // fast path: nothing to do
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, '$1');                      // display math
  t = t.replace(/\$([^$\n]{1,200}?)\$/g, '$1');                    // inline math
  t = t.replace(/\\(?:text|mathrm|mathbf|textbf|mbox)\{([^{}]*)\}/g, '$1');
  t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  t = t.replace(/\\sqrt\{([^{}]*)\}/g, '\u221a($1)');
  t = t.replace(/\\([A-Za-z]+)/g, (m, w) => SYMBOLS[w] ?? GREEK[w] ?? '');
  t = t.replace(/[{}]/g, '');
  return t;
}

export function MarkdownLite({ text, className = '' }) {
  const lines = deLatex(text).replace(/\r/g, '').split('\n');
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
