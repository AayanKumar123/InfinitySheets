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
export async function askAi({ mode = 'chat', context = {}, messages = [] }) {
  if (!isSupabaseConfigured) {
    throw new Error('AI needs the Supabase connection (set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY).');
  }
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, {
    body: { mode, context, messages: messages.map((m) => ({ role: m.role, content: m.content })) },
  });
  if (error) throw new Error(await readErrorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data?.text || '';
}

// Topic overviews are deterministic enough to cache for the session — saves
// free-tier quota when a student flips between topics.
export async function topicOverview(context, { force = false } = {}) {
  const key = `ai_overview:${context.board}:${context.subject}:${context.topic}:${context.ibLevel || ''}`;
  if (!force) {
    try { const cached = sessionStorage.getItem(key); if (cached) return cached; } catch (e) { /* ignore */ }
  }
  const text = await askAi({ mode: 'overview', context });
  try { sessionStorage.setItem(key, text); } catch (e) { /* ignore */ }
  return text;
}
