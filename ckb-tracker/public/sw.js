const CACHE_PREFIX = 'ckb-static-';
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isStaticAsset = request.method === 'GET'
    && url.origin === self.location.origin
    && url.pathname !== '/sw.js'
    && (['style', 'font', 'image'].includes(request.destination)
      || url.pathname.startsWith('/_next/static/'));

  if (!isStaticAsset) return;

  const isNextAsset = url.pathname.startsWith('/_next/static/');

  event.respondWith(
    (isNextAsset
      ? fetch(request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        }
        return response;
      }).catch(() => caches.match(request))
      : caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        }
        return response;
      }))),
  );
});
