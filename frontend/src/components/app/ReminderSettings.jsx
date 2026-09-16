import React from 'react';
import { Bell, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import * as store from '../../lib/dataStore';
import { notificationsSupported, requestNotificationPermission, showReminder } from '../../lib/reminders';
import { track } from '../../lib/analytics';

// Settings section for study reminders (local notifications) and the
// weekly email digest opt-in.
function Section({ title, icon: Icon, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-[color:var(--color-border)] bg-white p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
        <div><div className="text-[15px] font-semibold text-slate-900">{title}</div>{subtitle && <div className="text-[12.5px] text-slate-500 mt-0.5">{subtitle}</div>}</div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, hint, testid }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button type="button" onClick={() => onChange(!checked)} data-testid={testid} aria-pressed={checked} className={`mt-0.5 w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <div className="min-w-0"><div className="text-[13.5px] font-medium text-slate-900">{label}</div>{hint && <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{hint}</div>}</div>
    </label>
  );
}

export function RemindersSection() {
  const { state, updateSettings } = useApp();
  const s = state.settings || {};
  const isReal = !!(state.user && !state.user.isDemo && state.user.id);
  const supported = notificationsSupported();
  const perm = supported ? window.Notification.permission : 'unsupported';

  const togglePush = async (v) => {
    if (v) {
      const p = await requestNotificationPermission();
      if (p !== 'granted') { toast.error(p === 'unsupported' ? 'This browser does not support notifications' : 'Notifications are blocked for this site — allow them in the browser settings'); return; }
    }
    updateSettings({ pushReminders: v });
    if (isReal) store.updateNotificationPrefs({ pushReminders: v }, state.user.id).catch(() => null);
    track('reminders_toggled', { on: v });
    toast.success(v ? 'Daily reminders on' : 'Reminders off');
  };
  const toggleDigest = (v) => {
    updateSettings({ digestEmail: v });
    if (isReal) store.updateNotificationPrefs({ digestEmail: v }, state.user.id).catch(() => null);
    track('digest_toggled', { on: v });
    toast.success(v ? 'You will get a summary every Monday' : 'Weekly email off');
  };

  return (
    <Section title="Reminders & digest" icon={Bell} subtitle="A nudge when reviews are due, and a weekly email with your numbers.">
      <div className="flex flex-col gap-4">
        <Toggle checked={!!s.pushReminders} onChange={togglePush} testid="pref-push"
          label={<span className="inline-flex items-center gap-1.5"><Bell className="w-4 h-4 text-slate-600" /> Daily study reminder</span>}
          hint={perm === 'denied' ? 'Blocked in this browser — allow notifications for this site to use reminders.' : 'One notification a day, only when you have reviews due or your streak is at risk. Works while the app is installed or open in a tab.'} />
        {s.pushReminders && (
          <div className="flex flex-wrap items-center gap-3 pl-[52px]">
            <label className="text-[12.5px] text-slate-600 inline-flex items-center gap-2">Remind me at
              <select className="input-base w-auto py-1" value={s.reminderHour ?? 18} onChange={(e) => updateSettings({ reminderHour: parseInt(e.target.value, 10) })} data-testid="pref-reminder-hour">
                {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => showReminder({ title: 'InfinitySheets reminder', body: 'This is what a reminder looks like.' }).then((ok) => !ok && toast.error('Could not show a notification'))} className="text-[12.5px] text-violet-700 hover:text-violet-900" data-testid="pref-reminder-test">Send a test</button>
          </div>
        )}
        <Toggle checked={!!s.digestEmail} onChange={toggleDigest} testid="pref-digest"
          label={<span className="inline-flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-600" /> Weekly email digest</span>}
          hint={isReal ? 'Every Monday: questions answered, accuracy, streak, weakest topic and what to do this week. Unsubscribe here any time.' : 'Available on a real account (the demo has no email address).'} />
      </div>
    </Section>
  );
}
