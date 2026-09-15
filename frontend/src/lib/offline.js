// Offline mode + study reminders (features 8 and 16).
//
// Offline: the service worker in public/sw.js caches the app shell so the
// site opens with no network; the student's data is already on the device
// (AppContext mirrors state to localStorage) so worksheets can be taken and
// are pushed to Supabase when the browser comes back online.
//
// Reminders: local Notifications (no push server needed). A daily check at
// the chosen hour fires when reviews are due or the streak is about to
// break; the service worker shows it so it survives a backgrounded tab.

const isProd = process.env.NODE_ENV === 'production';

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  // CRA's dev server serves sw.js but hot reloading fights with it — prod only.
  if (!isProd) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => null);
  });
}

/** Subscribe to connectivity changes: cb(isOnline). Returns unsubscribe. */
export function watchOnline(cb) {
  if (typeof window === 'undefined') return () => {};
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  cb(navigator.onLine !== false);
  return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
}

/** Show a reminder now (via the SW when active, else a page Notification). */
export async function showReminder({ title, body, route = 'dashboard', tag = 'study-reminder' }) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg?.active) { reg.active.postMessage({ type: 'notify', title, body, route, tag }); return true; }
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
