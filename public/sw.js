// Offline app shell for the counter tablet. Bump CACHE when the app changes.
const CACHE = 'gj-custom-order-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Live prices must always come from the network; the app keeps its own offline copy.
  if (url.pathname.startsWith('/api/')) return;

  // Pages: try the network first so updates arrive, fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { caches.open(CACHE).then(c => c.put('/', res.clone())); return res; })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Built assets are content-hashed, so cache-first is safe.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    })),
  );
});
