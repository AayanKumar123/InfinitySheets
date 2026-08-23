import React, { useEffect, useMemo, useState } from 'react';
import { Filter, SlidersHorizontal, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import EmptyStateScene from '../decor/EmptyStateScene';
import { useStrengthsWeaknesses } from '../../hooks/useStrengthsWeaknesses';
import { predictedScore, formatGrade, TONE_CLASSES } from '../../lib/predictedGrade';

const PREFS_KEY = 'infinitysheets_sw_prefs_v1';

// Load & normalize persisted prefs. Backward-compatible with the legacy shape
// that stored a single `overrides` object at the top level.
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const readOv = (v) => (v && typeof v === 'object') ? {
      strengthMin: v.strengthMin != null ? Number(v.strengthMin) : null,
      weaknessMax: v.weaknessMax != null ? Number(v.weaknessMax) : null,
    } : null;
    return {
      level: ['all', 'strengths', 'weaknesses'].includes(p.level) ? p.level : 'all',
      subject: typeof p.subject === 'string' ? p.subject : 'all',
      // New shape
      globalOverrides: readOv(p.globalOverrides) || readOv(p.overrides), // migrate legacy
      subjectOverrides: (p.subjectOverrides && typeof p.subjectOverrides === 'object')
        ? Object.fromEntries(
            Object.entries(p.subjectOverrides)
              .map(([k, v]) => [k, readOv(v)])
              .filter(([, v]) => v)
          )
        : {},
      customizeOpen: !!p.customizeOpen,
    };
  } catch (_e) {
    return null;
  }
}
function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (_e) { /* ignore */ }
}

export default function Strengths() {
  const { state } = useApp();
  const ws = state.worksheets || [];

  // Hydrate persisted UI prefs on mount
  const initial = useMemo(() => loadPrefs() || {}, []);
  const [level, setLevel] = useState(initial.level || 'all');
  const [subject, setSubject] = useState(initial.subject || 'all');
  const [globalOverrides, setGlobalOverrides] = useState(initial.globalOverrides || null);
  const [subjectOverrides, setSubjectOverrides] = useState(initial.subjectOverrides || {});
  const [customizeOpen, setCustomizeOpen] = useState(!!initial.customizeOpen);

  // Persist whenever anything changes
  useEffect(() => {
    savePrefs({ level, subject, globalOverrides, subjectOverrides, customizeOpen });
  }, [level, subject, globalOverrides, subjectOverrides, customizeOpen]);

  // Effective overrides pass into the hooks. When "All subjects" is active we
  // use the global overrides; when a specific subject is active we use ONLY
  // that subject's overrides (independent from global, per product spec).
  const activeSubjectOverrides = subject !== 'all' ? (subjectOverrides[subject] || null) : null;
  const overridesForGlobalHook = globalOverrides;
  const overridesForScopedHook = activeSubjectOverrides;

  const {
    byTopic,
    avg: globalAvg,
    adaptiveStrengthMin: globalAdaptStrengthMin,
    adaptiveWeaknessMax: globalAdaptWeaknessMax,
    strengthMin: globalStrengthMin,
    weaknessMax: globalWeaknessMax,
    isCustom: globalIsCustom,
  } = useStrengthsWeaknesses(ws, overridesForGlobalHook);

  // Subject-scoped worksheets — when a subject is selected, thresholds and
  // the predicted grade are computed off ONLY that subject's data.
  const subjectWs = useMemo(
    () => (subject === 'all' ? ws : ws.filter((w) => w.subject === subject)),
    [ws, subject]
  );
  const {
    avg: scopedAvg,
    adaptiveStrengthMin: scopedAdaptStrengthMin,
    adaptiveWeaknessMax: scopedAdaptWeaknessMax,
    strengthMin: scopedStrengthMin,
    weaknessMax: scopedWeaknessMax,
    isCustom: scopedIsCustom,
  } = useStrengthsWeaknesses(subjectWs, overridesForScopedHook);

  // "avg / thresholds actually driving the UI" — use scoped values whenever
  // a subject is selected so the classification adapts to that subject.
  const isSubjectMode = subject !== 'all';
  const avg = isSubjectMode ? scopedAvg : globalAvg;
  const adaptiveStrengthMin = isSubjectMode ? scopedAdaptStrengthMin : globalAdaptStrengthMin;
  const adaptiveWeaknessMax = isSubjectMode ? scopedAdaptWeaknessMax : globalAdaptWeaknessMax;
  const strengthMin = isSubjectMode ? scopedStrengthMin : globalStrengthMin;
  const weaknessMax = isSubjectMode ? scopedWeaknessMax : globalWeaknessMax;
  const isCustom = isSubjectMode ? scopedIsCustom : globalIsCustom;

  // Predicted grade for the selected subject. Only shown when the student has
  // picked a specific subject — per product spec: "predicted grade is only for
  // individual subjects, not overall".
  const examTrack = state.user?.examTrack || 'CBSE';
  const predicted = useMemo(() => {
    if (!isSubjectMode || subjectWs.length === 0) return null;
    const score = predictedScore(subjectWs);
    return { score, ...formatGrade(score, examTrack) };
  }, [isSubjectMode, subjectWs, examTrack]);

  // If subject filter references a subject that no longer exists (e.g., after
  // reset demo), silently fall back to "all".
  const subjects = useMemo(() => {
    const set = new Set(byTopic.map((t) => t.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [byTopic]);
  useEffect(() => {
    if (subject !== 'all' && subjects.length > 0 && !subjects.includes(subject)) {
      setSubject('all');
    }
  }, [subject, subjects]);

  const subjectScoped = useMemo(
    () => (subject === 'all' ? byTopic : byTopic.filter((t) => t.subject === subject)),
    [byTopic, subject]
  );

  const strengthCount = useMemo(
    () => subjectScoped.filter((t) => t.acc >= strengthMin).length,
    [subjectScoped, strengthMin]
  );
  const weaknessCount = useMemo(
    () => subjectScoped.filter((t) => t.acc < weaknessMax).length,
    [subjectScoped, weaknessMax]
  );

  const filtered = useMemo(() => {
    if (level === 'strengths') return subjectScoped.filter((t) => t.acc >= strengthMin);
    if (level === 'weaknesses') return subjectScoped.filter((t) => t.acc < weaknessMax);
    return subjectScoped;
  }, [subjectScoped, level, strengthMin, weaknessMax]);

  if (byTopic.length === 0) {
    return (
      <div className="relative rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white overflow-hidden min-h-[360px]">
        <EmptyStateScene variant="both" className="absolute inset-0" />
        <div className="relative p-12 text-center">
          <div className="text-[15px] font-medium text-slate-700">No data yet</div>
          <div className="text-[13px] text-slate-500 mt-1">Complete a worksheet to see personalized learning analytics.</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'all', label: 'All', count: subjectScoped.length },
    { key: 'strengths', label: 'Strengths', count: strengthCount },
    { key: 'weaknesses', label: 'Weaknesses', count: weaknessCount },
  ];

  // Handlers for the override inputs — write to the currently-active scope
  // (global when "All subjects" is selected, per-subject otherwise).
  const writeOverride = (patch) => {
    if (subject === 'all') {
      setGlobalOverrides((prev) => ({
        strengthMin: prev?.strengthMin != null ? prev.strengthMin : adaptiveStrengthMin,
        weaknessMax: prev?.weaknessMax != null ? prev.weaknessMax : adaptiveWeaknessMax,
        ...patch,
      }));
    } else {
      setSubjectOverrides((prev) => {
        const cur = prev[subject] || {};
        return {
          ...prev,
          [subject]: {
            strengthMin: cur.strengthMin != null ? cur.strengthMin : adaptiveStrengthMin,
            weaknessMax: cur.weaknessMax != null ? cur.weaknessMax : adaptiveWeaknessMax,
            ...patch,
          },
        };
      });
    }
  };
  const setStrengthMin = (n) => {
    const v = Number(n);
    if (Number.isNaN(v)) return;
    writeOverride({ strengthMin: v });
  };
  const setWeaknessMax = (n) => {
    const v = Number(n);
    if (Number.isNaN(v)) return;
    writeOverride({ weaknessMax: v });
  };
  const resetThresholds = () => {
    if (subject === 'all') {
      setGlobalOverrides(null);
    } else {
      setSubjectOverrides((prev) => {
        const next = { ...prev };
        delete next[subject];
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Predicted grade banner — visible only when a specific subject is selected. */}
      {predicted && (
        <PredictedGradeBanner
          subject={subject}
          predicted={predicted}
          examTrack={examTrack}
          attempts={subjectWs.length}
        />
      )}

      {/* Filter bar */}
      <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="text-[12.5px] font-medium text-slate-500 shrink-0">Filter</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="ml-1 rounded-md border border-[color:var(--color-border)] bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition"
              aria-label="Filter by subject"
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {tabs.map((tab) => {
              const active = level === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setLevel(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                    active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-slate-500' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Adaptive threshold info + customize toggle */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
            Strength ≥ <span className="tabular-nums font-medium text-slate-700">{strengthMin}%</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
            Weakness &lt; <span className="tabular-nums font-medium text-slate-700">{weaknessMax}%</span>
          </span>
          <span className="text-slate-400">
            {isCustom ? (
              <span className="inline-flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10.5px] font-medium">
                  {isSubjectMode ? `Custom for ${subject}` : 'Custom'}
                </span>
                <span>
                  overrides your <span className="tabular-nums font-medium text-slate-600">{avg}%</span>
                  {isSubjectMode ? ` ${subject}` : ''} average
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-slate-400" />
                Adapts to your <span className="tabular-nums font-medium text-slate-600">{avg}%</span>
                {isSubjectMode ? <span className="ml-1 text-slate-500">{subject}</span> : null} average
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setCustomizeOpen((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-white px-2 py-1 text-[11.5px] font-medium text-slate-700 hover:border-slate-300 transition"
            aria-expanded={customizeOpen}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {customizeOpen ? 'Hide' : 'Customize'}
          </button>
        </div>

        {/* Customize panel */}
        {customizeOpen && (
          <div className="mt-3 rounded-lg border border-[color:var(--color-border)] bg-slate-50/60 p-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <ThresholdInput
                label="Strength ≥"
                dot="bg-blue-500"
                value={strengthMin}
                onChange={setStrengthMin}
                min={weaknessMax + 5}
                max={100}
                hint={`adaptive ${adaptiveStrengthMin}%`}
              />
              <ThresholdInput
                label="Weakness <"
                dot="bg-rose-400"
                value={weaknessMax}
                onChange={setWeaknessMax}
                min={0}
                max={Math.max(0, strengthMin - 5)}
                hint={`adaptive ${adaptiveWeaknessMax}%`}
              />
              <button
                type="button"
                onClick={resetThresholds}
                disabled={!isCustom}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Return to adaptive defaults"
              >
                <RotateCcw className="w-4 h-4" /> Reset to defaults
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Adaptive defaults are calculated from your weighted-average accuracy. Custom values are saved on this device.
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-8 text-center text-[13px] text-slate-500 bg-slate-50/50">
          {level === 'strengths'
            ? `No strengths yet${subject !== 'all' ? ` in ${subject}` : ''}. Topics with ${strengthMin}%+ accuracy will show up here.`
            : level === 'weaknesses'
              ? `No weaknesses${subject !== 'all' ? ` in ${subject}` : ''}. Topics below ${weaknessMax}% accuracy will show up here.`
              : `No topics${subject !== 'all' ? ` in ${subject}` : ''} yet.`}
        </div>
      ) : (
        <TopicGroupedBySubject
          topics={filtered}
          strengthMin={strengthMin}
          weaknessMax={weaknessMax}
          itemLabel={level === 'strengths' ? 'strength' : level === 'weaknesses' ? 'weakness' : 'topic'}
        />
      )}
    </div>
  );
}

// Group topics into one collapsible dropdown per subject. Each header shows
// the subject name, the topic count, and a chevron that rotates with the
// open/closed state. Topics are classified visually by the same thresholds
// the page uses (strength / neutral / weakness) so the colours stay
// consistent inside the dropdown.
function TopicGroupedBySubject({ topics, strengthMin, weaknessMax, itemLabel }) {
  const [open, setOpen] = useState({});
  const toggle = (subject) => setOpen((m) => ({ ...m, [subject]: !m[subject] }));

  const groups = useMemo(() => {
    const map = new Map();
    topics.forEach((t) => {
      const key = (t.subject || '').trim() || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return Array.from(map.entries())
      .map(([subject, list]) => ({ subject, list }))
      .sort((a, b) => {
        if (a.subject === 'Other') return 1;
        if (b.subject === 'Other') return -1;
        return a.subject.localeCompare(b.subject);
      });
  }, [topics]);

  return (
    <div className="flex flex-col gap-3" data-testid="sw-grouped-list">
      {groups.map(({ subject, list }) => {
        const isOpen = !!open[subject];
        const contentId = `sw-group-${subject}`;
        return (
          <section
            key={subject}
            className="rounded-xl border border-[color:var(--color-border)] bg-white overflow-hidden"
            data-testid={`sw-group-${subject}`}
          >
            <button
              type="button"
              onClick={() => toggle(subject)}
              aria-expanded={isOpen}
              aria-controls={contentId}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                <h3 className="text-[14.5px] font-semibold text-slate-900 truncate">{subject}</h3>
              </div>
              <span className="text-[12px] font-medium text-slate-500 shrink-0">
                {list.length} {list.length === 1 ? itemLabel : `${itemLabel}s`}
              </span>
            </button>
            {isOpen && (
              <div
                id={contentId}
                className="flex flex-col gap-3 px-5 pb-5 pt-1 border-t border-[color:var(--color-border)]"
                data-testid={contentId}
              >
                {list.map((t) => (
                  <div key={`${t.subject}-${t.topic}`} className="rounded-lg border border-[color:var(--color-border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[14px] font-medium text-slate-900 truncate">{t.topic}</div>
                      <div className="text-[13px] text-slate-700 tabular-nums shrink-0">{t.acc}% · {t.correct}/{t.total}</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${t.acc >= strengthMin ? 'bg-blue-500' : t.acc < weaknessMax ? 'bg-rose-400' : 'bg-amber-400'}`}
                        style={{ width: `${t.acc}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ThresholdInput({ label, dot, value, onChange, min, max, hint }) {
  return (
    <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      <div className="inline-flex items-center rounded-md border border-[color:var(--color-border)] bg-white overflow-hidden">
        <button
          type="button"
          className="px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onChange(Math.max(min, value - 5))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 py-1 text-center tabular-nums font-medium text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="pr-2 text-slate-500">%</span>
        <button
          type="button"
          className="px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onChange(Math.min(max, value + 5))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
      {hint && <span className="text-[10.5px] text-slate-400">{hint}</span>}
    </label>
  );
}


function PredictedGradeBanner({ subject, predicted, examTrack, attempts }) {
  const tone = TONE_CLASSES[predicted.tone] || TONE_CLASSES.ok;
  return (
    <div
      className={`rounded-xl border ${tone.border} ${tone.bg} px-4 py-3 flex flex-wrap items-center justify-between gap-3`}
      data-testid="predicted-grade-banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white/70 border ${tone.border}`}>
          <span className={`text-[18px] font-bold ${tone.text} tabular-nums`}>{predicted.label}</span>
        </span>
        <div className="min-w-0">
          <div className={`text-[11px] tracking-[0.14em] uppercase font-semibold ${tone.text}`}>
            {predicted.sub}
          </div>
          <div className="text-[14px] font-semibold text-slate-900 truncate">
            {subject} <span className="text-slate-400 font-normal">· {(examTrack || '').toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div className="text-right text-[11.5px] text-slate-500 max-w-[280px]">
        <div className="tabular-nums">
          Based on {attempts} {attempts === 1 ? 'worksheet' : 'worksheets'}
        </div>
        <div className="text-slate-400">
          Difficulty-weighted, heavy bias toward latest
        </div>
      </div>
    </div>
  );
}
