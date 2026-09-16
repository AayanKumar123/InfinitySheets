// Study reminders: local Notifications (no push server needed). A daily
// check at the chosen hour fires when reviews are due or the streak is
// about to break.

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
}

/** Show a reminder now. */
export async function showReminder({ title, body, route = 'dashboard', tag = 'study-reminder' }) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, { body, icon: '/icon-192.png', tag });
    n.onclick = () => { window.focus(); window.location.hash = `#${route}`; };
    return true;
  } catch (e) { return false; }
}

const LAST_KEY = 'infinitysheets_last_reminder';

/**
 * Decide whether to nudge today and do it at most once a day. Called from
 * the app on load and every 30 minutes; `hour` is the student's preferred
 * reminder hour (0-23).
 */
export function maybeRemind({ enabled, hour = 18, dueCount = 0, studiedToday = false, streak = 0 }) {
  if (!enabled || !notificationsSupported() || Notification.permission !== 'granted') return false;
  const now = new Date();
  if (now.getHours() < hour) return false;
  const today = now.toDateString();
  try { if (localStorage.getItem(LAST_KEY) === today) return false; } catch (e) { /* ignore */ }
  if (studiedToday && dueCount === 0) return false;
  let body;
  if (dueCount > 0 && !studiedToday) body = `${dueCount} review question${dueCount === 1 ? '' : 's'} due and nothing done today yet${streak ? ` — keep the ${streak}-day streak alive` : ''}.`;
  else if (dueCount > 0) body = `${dueCount} review question${dueCount === 1 ? '' : 's'} due today.`;
  else body = streak ? `Nothing done today — one short sheet keeps your ${streak}-day streak going.` : 'A short worksheet today keeps the momentum going.';
  try { localStorage.setItem(LAST_KEY, today); } catch (e) { /* ignore */ }
  return showReminder({ title: 'Time for a quick session', body, route: dueCount > 0 ? 'worksheets' : 'dashboard' });
}
