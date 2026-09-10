// Client for the `ai-chat` Supabase Edge Function (supabase/functions/ai-chat).
// The Gemini key never reaches the browser — the function holds it as a secret.
import { supabase, isSupabaseConfigured } from './supabase';

export const AI_FUNCTION = 'ai-chat';

// One switch in Settings turns every assistant off (topic pages, recommendations).
export function isAiEnabled(state) {
  return state?.settings?.aiEnabled !== false;
}

async function readErrorMessage(error) {
  // FunctionsHttpError carries the Response in `context`; surface the
  // function's own { error } message when there is one.
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch (e) { /* fall through */ }
  return error?.message || 'The AI could not answer right now.';
}

/**
 * Ask the assistant. `messages` is [{ role: 'user' | 'assistant', content }].
 * Resolves to the reply text; throws an Error with a readable message.
 */
export async function askAi({ mode = 'chat', context = {}, messages = [], force = false }) {
  if (!isSupabaseConfigured) {
    throw new Error('AI needs the Supabase connection (set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY).');
  }
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, {
    body: { mode, context, force, messages: messages.map((m) => ({ role: m.role, content: m.content })) },
  });
  if (error) throw new Error(await readErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data?.text || '';
}

// Topic overviews are deterministic enough to cache for the session — saves
// free-tier quota when a student flips between topics.
export async function topicOverview(context, { force = false } = {}) {
  // Two layers. sessionStorage saves a round-trip while a student clicks
  // between topics; the server-side cache (public.topic_overviews) is the one
  // that matters — it is shared by every student, so a topic costs one Gemini
  // call for all time rather than one per visit. `force` skips both.
  const key = `ai_overview:${context.board}:${context.subject}:${context.topic}:${context.ibLevel || ''}`;
  if (!force) {
    try { const cached = sessionStorage.getItem(key); if (cached) return cached; } catch (e) { /* ignore */ }
  }
  const text = await askAi({ mode: 'overview', context, force });
  try { sessionStorage.setItem(key, text); } catch (e) { /* ignore */ }
  return text;
}

// Summarise a finished worksheet for the diagnosis prompt: every question,
// the accepted answer and what the student put. Wrong answers always go in;
// correct ones are trimmed on very long sheets to keep the request small.
function describeQuestion(q, given, ok, n) {
  const type = q.answerType || 'Multiple choice';
  let expected = '';
  let student = '';
  if (type === 'Multiple choice' && Array.isArray(q.options)) {
    expected = q.options[q.a];
    student = typeof given === 'number' && given >= 0 ? q.options[given] : '(no answer)';
  } else if (type === 'Typed response') {
    expected = q.typedAnswer || (q.options ? q.options[q.a] : '');
    student = given ? String(given) : '(blank)';
  } else {
    expected = q.examAnswer || (q.examKeywords || []).join(', ') || '(marked on key ideas)';
    student = given ? String(given) : '(blank)';
  }
  const clip = (t, n2) => (String(t).length > n2 ? `${String(t).slice(0, n2)}…` : String(t));
  return `${n}. [${ok ? 'correct' : 'WRONG'}] ${clip(q.q, 260)}\n   Accepted: ${clip(expected, 200)}\n   Student: ${clip(student, 300)}`;
}

export async function diagnoseWorksheet(sheet, { board, ibLevel } = {}) {
  const qs = sheet.questions || [];
  const results = sheet.results || qs.map((q, i) => (sheet.answers || [])[i] === q.a);
  const lines = [];
  let keptCorrect = 0;
  qs.forEach((q, i) => {
    const ok = !!results[i];
    if (ok && qs.length > 25 && keptCorrect >= 8) return;
    if (ok) keptCorrect += 1;
    lines.push(describeQuestion(q, (sheet.answers || [])[i], ok, i + 1));
  });
  const mins = Math.floor((sheet.durationSec || 0) / 60);
  const secs = (sheet.durationSec || 0) % 60;
  const content = [
    `Worksheet just completed by the student.`,
    `Board: ${board || sheet.board || 'unknown'}${ibLevel ? ` (${ibLevel})` : ''}. Subject: ${sheet.subject}. Topics: ${sheet.topic}.`,
    `Difficulty: ${sheet.difficulty}. Answer type: ${sheet.answerType}. Score: ${sheet.score}% (${sheet.correct}/${sheet.total}). Time taken: ${mins}m ${secs}s.`,
    '',
    'Questions:',
    ...lines,
  ].join('\n');
  return askAi({
    mode: 'diagnose',
    context: { board, ibLevel, subject: sheet.subject, topic: sheet.topic },
    messages: [{ role: 'user', content }],
  });
}
