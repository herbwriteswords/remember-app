const VERSION = 'remember-v7-pushurl';
const SHELL = ['./', 'index.html', 'styles.css', 'method.js', 'bible.js', 'app.js', 'config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  // Cross-origin (api.esv.org, bible-api.com) and non-GET: never touched — straight to the network.
  if (req.method !== 'GET' || u.origin !== self.location.origin) return;
  // Same-origin: network-first so fixes land immediately; cache is the offline fallback.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(VERSION).then(cache => cache.put(req, c)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});

// ---------- Push reminders ----------
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Time for today’s verse', {
    body: d.body || 'A few minutes with today’s verse.', tag: d.tag || 'daily', renotify: true,
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(target);
  }));
});
