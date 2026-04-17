const CACHE = 'medlog-v3';
const URLS = [
  '/medlog/',
  '/medlog/index.html',
  '/medlog/manifest.webmanifest',
  '/medlog/icon-192.png',
  '/medlog/icon-512.png',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // index.html はネットワーク優先
  if (url.pathname === '/medlog/' || url.pathname === '/medlog/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 画像・マニフェストはキャッシュ優先
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
