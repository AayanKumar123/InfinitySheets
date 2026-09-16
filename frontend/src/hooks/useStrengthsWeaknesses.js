import { useEffect, useMemo, useState } from 'react';

// Clamp helper
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// localStorage key shared with the Strengths page for user overrides.
const PREFS_KEY = 'infinitysheets_sw_prefs_v1';

/**
 * Migrate any older payload shape to the new one so returning users don't lose
 * their customization. Old shape stored `overrides` at the top level (applied
 * globally). New shape splits into `globalOverrides` (used when the "All
 * subjects" view is active) and `subjectOverrides` (per-subject, independent).
 */
function normalizePrefs(raw) {
  if (!raw) return { globalOverrides: null, subjectOverrides: {} };
  const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const out = {
    globalOverrides: null,
    subjectOverrides: {},
  };
  if (p.globalOverrides && typeof p.globalOverrides === 'object') {
    out.globalOverrides = {
      strengthMin: p.globalOverrides.strengthMin != null ? Number(p.globalOverrides.strengthMin) : null,
      weaknessMax: p.globalOverrides.weaknessMax != null ? Number(p.globalOverrides.weaknessMax) : null,
    };
  } else if (p.overrides && typeof p.overrides === 'object') {
    // Legacy: single `overrides` object → treat as global.
    out.globalOverrides = {
      strengthMin: p.overrides.strengthMin != null ? Number(p.overrides.strengthMin) : null,
      weaknessMax: p.overrides.weaknessMax != null ? Number(p.overrides.weaknessMax) : null,
    };
  }
  if (p.subjectOverrides && typeof p.subjectOverrides === 'object') {
    Object.entries(p.subjectOverrides).forEach(([k, v]) => {
      if (v && typeof v === 'object') {
        out.subjectOverrides[k] = {
          strengthMin: v.strengthMin != null ? Number(v.strengthMin) : null,
          weaknessMax: v.weaknessMax != null ? Number(v.weaknessMax) : null,
        };
      }
    });
  }
  return out;
}

function readPrefs() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PREFS_KEY) : null;
    if (!raw) return { globalOverrides: null, subjectOverrides: {} };
    return normalizePrefs(raw);
  } catch (_e) {
    return { globalOverrides: null, subjectOverrides: {} };
  }
}

/**
 * Live-updating read of the saved threshold prefs. Consumers get both the
 * global overrides and the per-subject map. Handy for the Strengths page and
 * anything else that needs both.
 */
function useSavedSwPrefsInternal() {
  const [prefs, setPrefs] = useState(readPrefs);
  useEffect(() => {
    const handler = (e) => {
      if (!e || e.key === PREFS_KEY || e.key === null) setPrefs(readPrefs());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handler);
      const t = setTimeout(() => setPrefs(readPrefs()), 300);
      return () => { window.removeEventListener('storage', handler); clearTimeout(t); };
    }
    return undefined;
  }, []);
  return prefs;
}

// Public export — Strengths page & Performance page use this to read all
// saved prefs at once and pick the right override slice per subject.
export const useSavedSwPrefs = useSavedSwPrefsInternal;

/**
 * Returns the GLOBAL overrides only. Used by Dashboard / Smart Recommendations
 * whose scope is the whole student profile, not a specific subject.
 */
export function useSavedSwOverrides() {
  return useSavedSwPrefsInternal().globalOverrides;
}

/**
 * Returns the effective overrides for a specific subject scope. Subject
 * overrides are INDEPENDENT — they do not fall back to the global overrides
 * (per product spec). Pass `null` / `'all'` to get the global scope.
 */
export function useSavedSwOverridesFor(subject) {
  const prefs = useSavedSwPrefsInternal();
  if (!subject || subject === 'all') return prefs.globalOverrides;
  return prefs.subjectOverrides?.[subject] || null;
}

// Non-hook variant of the same lookup, for use inside memos.
export function pickOverridesFor(prefs, subject) {
  if (!prefs) return null;
  if (!subject || subject === 'all') return prefs.globalOverrides;
  return prefs.subjectOverrides?.[subject] || null;
}

/**
 * Pure computation of strengths/weaknesses stats for a set of worksheets.
 * Extracted from {@link useStrengthsWeaknesses} so it can be called inside a
 * useMemo for multiple subjects without violating the Rules of Hooks.
 */
export function computeSw(worksheets, overrides) {
  const ws = worksheets || [];
  const t = {};
  ws.forEach((w) => {
    if (!t[w.topic]) t[w.topic] = { correct: 0, total: 0, subject: w.subject };
    t[w.topic].correct += w.correct;
    t[w.topic].total += w.total;
  });
  const byTopic = Object.entries(t)
    .map(([k, v]) => ({ topic: k, ...v, acc: v.total ? Math.round((v.correct / v.total) * 100) : 0 }))
    .sort((a, b) => b.acc - a.acc);

  const totalCorrect = byTopic.reduce((s, x) => s + x.correct, 0);
  const totalQ = byTopic.reduce((s, x) => s + x.total, 0);
  const avg = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0;
  let adaptiveStrengthMin = clamp(Math.round(avg + 10), 60, 90);
  let adaptiveWeaknessMax = clamp(Math.round(avg - 10), 20, 55);
  if (adaptiveWeaknessMax >= adaptiveStrengthMin - 10) adaptiveWeaknessMax = adaptiveStrengthMin - 10;

  const ov = overrides || {};
  let strengthMin = ov.strengthMin != null ? Number(ov.strengthMin) : adaptiveStrengthMin;
  let weaknessMax = ov.weaknessMax != null ? Number(ov.weaknessMax) : adaptiveWeaknessMax;
  strengthMin = clamp(strengthMin, 10, 100);
  weaknessMax = clamp(weaknessMax, 0, 90);
  if (weaknessMax >= strengthMin - 5) weaknessMax = Math.max(0, strengthMin - 5);

  const isCustom = strengthMin !== adaptiveStrengthMin || weaknessMax !== adaptiveWeaknessMax;
  const strengths = byTopic.filter((x) => x.acc >= strengthMin);
  const weaknesses = byTopic.filter((x) => x.acc < weaknessMax);

  return {
    byTopic,
    avg,
    adaptiveStrengthMin,
    adaptiveWeaknessMax,
    strengthMin,
    weaknessMax,
    isCustom,
    strengths,
    weaknesses,
  };
}

/**
 * Shared strengths/weaknesses computation used across the app (Strengths page,
 * Dashboard, Smart Recommendations).
 *
 * Adaptive thresholds are derived from the student's own weighted-average
 * accuracy across all completed topics:
 *
 *   adaptiveStrengthMin = round(avg + 10), clamped to [60, 90]
 *   adaptiveWeaknessMax = round(avg - 10), clamped to [20, 55]
 *
 * A minimum 10-pt gap is enforced so the buckets never overlap.
 *
 * The caller may override either threshold via the `overrides` argument to
 * support "Customize" mode. `isCustom` is true whenever the effective values
 * differ from the adaptive defaults.
 *
 * @param {Array} worksheets  - list of worksheet records ({subject, topic, correct, total})
 * @param {{strengthMin?: number|null, weaknessMax?: number|null}} [overrides]
 */
export function useStrengthsWeaknesses(worksheets, overrides) {
  return useMemo(() => computeSw(worksheets, overrides), [worksheets, overrides]);
}

export default useStrengthsWeaknesses;
