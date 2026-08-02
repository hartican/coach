const CACHE_NAME = 'do-less-cache-20260802T155226Z';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/coach.html',
  '/setup.html',
  '/admin.html',
  '/coach-state-core.js',
  '/coach-prescription-core.js',
  '/do-less-archetype-core.js',
  '/do-less-exercise-catalog.js',
  '/do-less-session-engine.js',
  '/do-less-session-outcome-core.js',
  '/do-less-profile-store.js',
  '/do-less-checkin-core.js',
  '/do-less-adaptation-core.js',
  '/do-less-sync-core.js',
  '/do-less-profile-planners.js',
  '/do-less-supabase-sync.js',
  '/do-less-cloud.js',
  '/do-less-setup.js',
  '/do-less-admin.js',
  '/manifest.json',
  '/version.json',
  '/assets/icon-180.png',
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

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const actions = {
    'workout-now': '/coach.html?action=workout-now',
    'quick-start': '/coach.html?action=quick-start',
    'played-sport': '/coach.html?action=played-sport'
  };
  const target = new URL(actions[event.action] || '/coach.html', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(windows => {
      const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
      if (existing) return existing.navigate(target).then(client => client.focus());
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;
  const isHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html') ||
    url.pathname === '/version.json';

  // network-first for pages and version.json so deploys land immediately;
  // cache is only the offline fallback
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(resp => {
        if (event.request.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
      if (event.request.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
      }
      return resp;
    }).catch(() => cached))
  );
});
