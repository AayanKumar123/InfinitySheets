/* InfinitySheets service worker: offline app shell + study reminders.
 *
 * - Precaches the shell on install; serves navigations from cache when the
 *   network is down (the app then runs on the localStorage copy of the
 *   student's data and re-syncs when `online` fires).
 * - Same-origin static assets: stale-while-revalidate.
 * - Supabase / API requests: network only (never cached).
 * - Notification clicks open the app at the review page.
 */
const VERSION = 'v1';
const SHELL = `infinitysheets-shell-${VERSION}`;
const ASSETS = `infinitysheets-assets-${VERSION}`;
const PRECACHE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE).catch(() => null)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, CDNs: network only

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => { caches.open(SHELL).then((c) => c.put('/index.html', res.clone())); return res; })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  // Hashed build assets and icons: cache first, refresh in the background.
  if (/\.(js|css|png|svg|ico|woff2?|json)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = `${self.location.origin}/#${event.notification.data?.route || 'dashboard'}`;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.location.origin));
    if (open) { open.navigate(target); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});

// The page asks for a reminder to be shown (persists even when the tab is
// in the background).
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'notify' && self.registration?.showNotification) {
    self.registration.showNotification(d.title || 'InfinitySheets', { body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || 'study-reminder', data: { route: d.route || 'dashboard' } });
  }
});
