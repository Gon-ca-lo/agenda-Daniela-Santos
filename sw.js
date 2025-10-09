const CACHE_NAME = 'agenda-v1';
const ASSETS = [
  './',                // index.html
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
  // add any other static files you need cached
];

// INSTALL: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH: navigation = network-first, others = cache-first
self.addEventListener('fetch', event => {
  const req = event.request;

  // HTML pages => network-first, fallback to cached index
  if (
    req.mode === 'navigate' ||
    (req.method === 'GET' &&
      req.headers.get('accept') &&
      req.headers.get('accept').includes('text/html'))
  ) {
    event.respondWith(
      fetch(req).catch(() => caches.match('index.html'))
    );
    return;
  }

  // All other requests => cache-first, then network
  event.respondWith(
    caches.match(req).then(res => {
      if (res) return res;
      return fetch(req)
        .then(r => {
          // runtime caching (optional)
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, r.clone());
            return r;
          });
        })
        .catch(() => {
          // fallback for missing images
          if (req.destination === 'image') {
            return caches.match('icon-192.png');
          }
          // optionally do nothing for other types
        });
    })
  );
});