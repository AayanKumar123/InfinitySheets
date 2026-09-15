// Product analytics event bus. Pluggable: PostHog or Plausible when their
// env keys are set, otherwise a no-op that only logs in development.
//
//   REACT_APP_POSTHOG_KEY   + optional REACT_APP_POSTHOG_HOST
//   REACT_APP_PLAUSIBLE_DOMAIN
//
// Events carry no personal data — ids are hashed, free text is never sent.

const PH_KEY = process.env.REACT_APP_POSTHOG_KEY || '';
const PH_HOST = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';
const PLAUSIBLE_DOMAIN = process.env.REACT_APP_PLAUSIBLE_DOMAIN || '';
const isProd = process.env.NODE_ENV === 'production';

let ready = false;
let distinctId = 'anon';
const queue = [];

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

export const analyticsProvider = PH_KEY ? 'posthog' : PLAUSIBLE_DOMAIN ? 'plausible' : 'none';

/** Boot the configured provider once. Safe to call many times. */
export async function initAnalytics() {
  if (ready || typeof window === 'undefined') return;
  try {
    if (PH_KEY) {
      await loadScript(`${PH_HOST}/static/array.js`);
      window.posthog?.init?.(PH_KEY, { api_host: PH_HOST, capture_pageview: false, persistence: 'localStorage', autocapture: false });
    } else if (PLAUSIBLE_DOMAIN) {
      await loadScript('https://plausible.io/js/script.manual.js', { 'data-domain': PLAUSIBLE_DOMAIN });
    }
  } catch (e) { /* provider blocked (ad blocker) — stay silent */ }
  ready = true;
  queue.splice(0).forEach(({ name, props }) => track(name, props));
}

/** Identify the signed-in student by an opaque id (never the email). */
export function identify(userId) {
  distinctId = userId ? `u_${String(userId).slice(0, 8)}` : 'anon';
  if (PH_KEY && window.posthog?.identify) window.posthog.identify(distinctId);
}

/** Record one event: track('worksheet_completed', { subject, score }). */
export function track(name, props = {}) {
  if (typeof window === 'undefined') return;
  if (!ready) { queue.push({ name, props }); return; }
  const clean = {};
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'string') clean[k] = v.slice(0, 80);
    else if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
  });
  try {
    if (PH_KEY && window.posthog?.capture) window.posthog.capture(name, clean);
    else if (PLAUSIBLE_DOMAIN && window.plausible) window.plausible(name, { props: clean });
    else if (!isProd) console.debug('[analytics]', name, clean); // eslint-disable-line no-console
  } catch (e) { /* never break the app for analytics */ }
}

/** Route views: track('$pageview') for PostHog, pageview() for Plausible. */
export function pageview(route) {
  if (PH_KEY) track('$pageview', { route });
  else if (PLAUSIBLE_DOMAIN && window.plausible) { try { window.plausible('pageview', { u: `${window.location.origin}/${route}` }); } catch (e) { /* ignore */ } }
  else track('pageview', { route });
}
