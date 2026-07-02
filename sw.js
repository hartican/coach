const CACHE_NAME = 'hwp-cache-20260702T005900Z';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/home-workout-planner.html',
  '/manifest.json',
  '/version.json',
  '/assets/icon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // network-first for version.json, otherwise cache-first
  const url = new URL(event.request.url);
  if (url.pathname === '/version.json') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      // optionally cache new GET requests for same-origin
      if (event.request.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
      }
      return resp;
    }).catch(() => cached))
  );
});
