const VERSION = 'remember-v4-swipe';
const SHELL = ['./', 'index.html', 'styles.css', 'method.js', 'bible.js', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
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
