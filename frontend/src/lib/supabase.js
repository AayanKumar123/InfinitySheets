// Single Supabase browser client for the whole frontend. Reads the public
// (anon/publishable) key from the CRA environment. The service_role key is
// NEVER used here — it lives only in the FastAPI backend.
import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced clearly in the console; the app still boots (demo mode works
  // with no network), but real auth/sync will be disabled.
  // eslint-disable-next-line no-console
  console.error('[supabase] Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    persistSession: true, // localStorage — survives reloads
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles the OAuth (Google) redirect callback
    storageKey: 'infinitysheets_auth',
  },
});

export const isSupabaseConfigured = Boolean(url && anonKey && !String(anonKey).includes('public-anon-key'));
