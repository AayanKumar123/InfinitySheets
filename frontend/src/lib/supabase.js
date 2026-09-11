// Single Supabase browser client for the whole frontend.
//
// The project URL and the anon (publishable) key are baked in below, so the
// app works from any clone or deploy with no .env setup. That is safe: the
// anon key is designed to ship in the browser bundle — every Supabase frontend
// exposes it — and every table is protected by row-level security, so it can
// only do what an anonymous visitor is allowed to do. The service_role key is
// a different matter and NEVER appears in the frontend; it lives only in the
// edge function's secrets.
//
// REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY still override these
// when set, for pointing a build at a different project.
import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://annyogfzxzznyzkzlodx.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubnlvZ2Z6eHp6bnl6a3psb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTU0NjUsImV4cCI6MjA5ODU3MTQ2NX0.GsEdbczAmM1qGbrn7O0OWzs7TYwZ4tN4jb3owSuiKo8';

const url = (process.env.REACT_APP_SUPABASE_URL || '').trim() || DEFAULT_URL;
const anonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim() || DEFAULT_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true, // localStorage — survives reloads
    autoRefreshToken: true,
    detectSessionInUrl: true, // handles the OAuth (Google) redirect callback
    storageKey: 'infinitysheets_auth',
  },
});

// Always true now that defaults exist; kept because callers gate on it.
export const isSupabaseConfigured = Boolean(url && anonKey);
