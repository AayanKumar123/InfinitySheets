import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { toast } from 'sonner';
import { User, Sliders, Accessibility, GraduationCap, AlertTriangle, Save, RotateCcw, Trash2, Sun, Moon, Keyboard, BookOpen, Calendar, Bot } from 'lucide-react';
import { EXAM_TRACKS, SUBJECTS } from '../../data/mock';

const GOALS = [5, 10, 20];
const WEEKLY_GOALS = [20, 50, 100];
const FREQUENCIES = ['1-2 per week', '3-4 per week', 'Daily'];
const DIFF = ['Easy', 'Medium', 'Exam level', 'Hard'];

// --------------------------------------------------------------------------
// Root
// --------------------------------------------------------------------------

export default function SettingsView() {
  const { state, updateProfile, updateSettings, resetProgress, deleteAccount, restartTutorial, restartOnboarding, toggleTheme } = useApp();

  return (
    <div className="max-w-[820px] flex flex-col gap-5">
      <p className="text-[14px] text-slate-500">Manage your account, study preferences, and how the app behaves.</p>

      <AccountDetails user={state.user} updateProfile={updateProfile} />

      <Preferences settings={state.settings} updateSettings={updateSettings} />

      <AiSection settings={state.settings} updateSettings={updateSettings} />
      <AccessibilitySection settings={state.settings} updateSettings={updateSettings} theme={state.theme} toggleTheme={toggleTheme} />

      <SetupSection user={state.user} settings={state.settings} restartOnboarding={restartOnboarding} />

      <DangerZone
        resetProgress={resetProgress}
        deleteAccount={deleteAccount}
        restartTutorial={restartTutorial}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Section wrapper
// --------------------------------------------------------------------------

function Section({ title, icon: Icon, subtitle, danger = false, children }) {
  return (
    <div className={`rounded-2xl border ${danger ? 'border-rose-200 bg-rose-50/30' : 'border-[color:var(--color-border)] bg-white'} p-5`}>
      <div className="flex items-start gap-3 mb-4">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0">
          <div className={`text-[16px] font-semibold ${danger ? 'text-rose-800' : 'text-slate-900'}`}>{title}</div>
          {subtitle && <div className={`text-[12.5px] ${danger ? 'text-rose-700/80' : 'text-slate-500'} mt-0.5`}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function SegmentedButtons({ options, value, onChange, testid }) {
  return (
    <div className="inline-flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg" data-testid={testid}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value ?? o)}
          onClick={() => onChange(o.value ?? o)}
          className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${(o.value ?? o) === value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {o.label ?? o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint, testid }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        data-testid={testid}
        aria-pressed={checked}
        className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-slate-900">{label}</div>
        {hint && <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{hint}</div>}
      </div>
    </label>
  );
}

// --------------------------------------------------------------------------
// Account details
// --------------------------------------------------------------------------

function AccountDetails({ user, updateProfile }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const isDemo = !!user?.isDemo;
  const dirty = name !== (user?.name || '') || email !== (user?.email || '') || avatar !== (user?.avatar || '');

  const save = () => {
    updateProfile({ name: name.trim() || 'Student', email: email.trim(), avatar: avatar.trim() || null });
    toast.success('Account details saved');
  };

  return (
    <Section title="Account details" icon={User} subtitle={isDemo ? 'Demo session — changes are saved on this device only.' : 'Your name and how we identify you.'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Display name">
          <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Priya" data-testid="settings-name" />
        </Field>
        <Field label="Email" hint={isDemo ? 'Demo accounts do not use a real email.' : ''}>
          <input className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="settings-email" />
        </Field>
        <Field label="Avatar URL (optional)">
          <input className="input-base" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Role">
          <div className="input-base flex items-center text-[13.5px] text-slate-600 bg-slate-50">{isDemo ? 'Demo student' : user?.role === 'admin' ? 'Administrator' : 'Student'}</div>
        </Field>
      </div>
      <button
        onClick={save}
        disabled={!dirty}
        data-testid="settings-save-account"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-40"
      >
        <Save className="w-5 h-5" /> Save account details
      </button>
    </Section>
  );
}

// --------------------------------------------------------------------------
// Preferences
// --------------------------------------------------------------------------

function Preferences({ settings, updateSettings }) {
  const [s, setS] = useState({ ...settings });
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);

  const save = () => {
    updateSettings(s);
    toast.success('Preferences saved');
  };

  return (
    <Section title="Preferences" icon={Sliders} subtitle="How much you want to practise and how hard.">
      <div className="grid grid-cols-1 gap-4">
        <Field label="Daily goal">
          <SegmentedButtons options={GOALS.map((g) => ({ value: g, label: `${g} questions` }))} value={s.dailyGoal} onChange={(v) => setS({ ...s, dailyGoal: v })} testid="pref-daily" />
        </Field>
        <Field label="Weekly goal">
          <SegmentedButtons options={WEEKLY_GOALS.map((g) => ({ value: g, label: `${g} questions` }))} value={s.weeklyGoal} onChange={(v) => setS({ ...s, weeklyGoal: v })} testid="pref-weekly" />
        </Field>
        <Field label="Study frequency">
          <SegmentedButtons options={FREQUENCIES} value={s.frequency} onChange={(v) => setS({ ...s, frequency: v })} testid="pref-frequency" />
        </Field>
        <Field label="Default worksheet difficulty">
          <SegmentedButtons options={DIFF} value={s.defaultDifficulty} onChange={(v) => setS({ ...s, defaultDifficulty: v })} testid="pref-difficulty" />
        </Field>
      </div>
      <button
        onClick={save}
        disabled={!dirty}
        data-testid="settings-save-prefs"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95 disabled:opacity-40"
      >
        <Save className="w-5 h-5" /> Save preferences
      </button>
    </Section>
  );
}

// --------------------------------------------------------------------------
// Accessibility
// --------------------------------------------------------------------------

function AiSection({ settings, updateSettings }) {
  const on = settings.aiEnabled !== false;
  return (
    <Section title="AI assistants" icon={Bot} subtitle="The topic overviews, doubt-clearing tutor and the study coach in Smart Recommendations.">
      <Toggle
        checked={on}
        onChange={(v) => { updateSettings({ aiEnabled: v }); toast.success(v ? 'AI assistants enabled' : 'All AI assistants turned off'); }}
        label={<span className="inline-flex items-center gap-1.5"><Bot className="w-4 h-4 text-slate-600" /> Enable AI assistants</span>}
        hint="Turning this off hides every AI chatbot and AI overview across the app. Your questions are sent to Google Gemini only while this is on."
        testid="pref-ai"
      />
    </Section>
  );
}

function AccessibilitySection({ settings, updateSettings, theme, toggleTheme }) {
  return (
    <Section title="Accessibility" icon={Accessibility} subtitle="Interaction and display options that make the app work better for you.">
      <div className="flex flex-col gap-4">
        <Toggle
          checked={settings.keyboardShortcuts !== false}
          onChange={(v) => { updateSettings({ keyboardShortcuts: v }); toast.success(v ? 'Keyboard shortcuts enabled' : 'Keyboard shortcuts disabled'); }}
          label={<span className="inline-flex items-center gap-1.5"><Keyboard className="w-4 h-4 text-slate-600" /> Keyboard shortcuts on worksheets</span>}
          hint="Press A–D or 1–4 to pick an option, → to advance, ← to go back."
          testid="pref-keyboard"
        />
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-slate-900 inline-flex items-center gap-1.5">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-slate-600" />} Theme
            </div>
            <div className="text-[12px] text-slate-500 mt-0.5">Currently {theme === 'dark' ? 'dark' : 'light'} mode.</div>
          </div>
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
            data-testid="settings-toggle-theme"
          >
            Switch to {theme === 'dark' ? 'light' : 'dark'}
          </button>
        </div>
      </div>
    </Section>
  );
}

// --------------------------------------------------------------------------
// Setup — mirrors the onboarding wizard choices
// --------------------------------------------------------------------------

function SetupSection({ user, settings, restartOnboarding }) {
  const trackId = user?.examTrack || '';
  const track = useMemo(() => EXAM_TRACKS.find((t) => t.id === trackId), [trackId]);
  const trackSubjects = useMemo(() => SUBJECTS[trackId] || [], [trackId]);
  const picked = user?.subjects || [];

  const redo = () => {
    restartOnboarding();
    toast.success('Setup restarted — pick your options again');
    window.location.hash = '#dashboard';
  };

  return (
    <Section title="Setup" icon={GraduationCap} subtitle="Your exam track and subjects from the initial setup.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ReadonlyRow label="Exam track" value={track ? track.name : (trackId || 'Not set')} icon={GraduationCap} />
        <ReadonlyRow label="Study frequency" value={settings?.frequency || 'Not set'} icon={Calendar} />
        <ReadonlyRow label="Weekly goal" value={settings?.weeklyGoal ? `${settings.weeklyGoal} questions` : 'Not set'} />
        <ReadonlyRow label="Default difficulty" value={settings?.defaultDifficulty || 'Not set'} />
      </div>
      <div className="mt-4">
        <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-2 inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Subjects you picked</div>
        {picked.length === 0 ? (
          <div className="text-[13px] text-slate-500 italic">You haven&apos;t picked any subjects yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {picked.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-100 text-[12px] font-semibold">{s}</span>
            ))}
          </div>
        )}
        {trackSubjects.length > picked.length && (
          <div className="text-[11.5px] text-slate-500 mt-2">Also available on {track?.name || trackId}: {trackSubjects.filter((s) => !picked.includes(s)).join(', ')}</div>
        )}
      </div>
      <button
        onClick={redo}
        data-testid="settings-redo-setup"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-semibold text-white bg-blue-600 hover:opacity-95"
      >
        <RotateCcw className="w-5 h-5" /> Redo setup
      </button>
    </Section>
  );
}

function ReadonlyRow({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.14em] uppercase font-semibold text-slate-500 mb-1">{label}</div>
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13.5px] text-slate-800 inline-flex items-center gap-1.5">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />} {value}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Danger zone
// --------------------------------------------------------------------------

function DangerZone({ resetProgress, deleteAccount, restartTutorial }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Section title="Danger zone" icon={AlertTriangle} subtitle="Irreversible actions and things that reset your progress." danger>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-rose-100 bg-white p-4">
          <div className="text-[13.5px] font-semibold text-slate-900">Replay welcome tour</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5 mb-3">Walk through the guided tour again to revisit how the app works.</div>
          <button onClick={() => { restartTutorial(); toast.success('Tutorial restarted'); window.location.hash = '#dashboard'; }} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-slate-300 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50">
            Replay tour
          </button>
        </div>
        <div className="rounded-xl border border-rose-100 bg-white p-4">
          <div className="text-[13.5px] font-semibold text-slate-900">Reset my progress</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5 mb-3">Clear worksheets, scores, streak, and mistake history. Your account and courses stay.</div>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-amber-300 text-amber-800 text-[12.5px] font-semibold hover:bg-amber-50">
              <RotateCcw className="w-4 h-4" /> Reset progress
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { resetProgress(); setConfirmReset(false); toast.success('Progress reset'); }} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-white bg-amber-500 hover:bg-amber-600 text-[12.5px] font-semibold">Confirm reset</button>
              <button onClick={() => setConfirmReset(false)} className="inline-flex items-center px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-rose-300 bg-white p-4">
          <div className="text-[13.5px] font-semibold text-rose-700">Delete account</div>
          <div className="text-[12.5px] text-rose-600/80 mt-0.5 mb-3">Permanently remove this account, worksheets, courses, and settings from this device.</div>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-white bg-rose-600 hover:bg-rose-700 text-[12.5px] font-semibold">
              <Trash2 className="w-4 h-4" /> Delete account
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { deleteAccount(); window.location.hash = ''; }} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-white bg-rose-600 hover:bg-rose-700 text-[12.5px] font-semibold">Confirm delete</button>
              <button onClick={() => setConfirmDelete(false)} className="inline-flex items-center px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 text-[12.5px] font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
