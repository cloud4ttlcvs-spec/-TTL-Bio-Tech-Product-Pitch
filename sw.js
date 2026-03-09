// sw.js - V3.7.0 圖片快取修正版
const CACHE_NAME = 'ttl-pwa-v68'; // App 核心快取
const IMAGE_CACHE_NAME = 'ttl-images-v2'; // 專門存圖片的快取
const IMAGE_RETRY_PARAM = 'img_retry';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './LOGO.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

function isImageRequest(request, url) {
  return request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
    url.hostname.includes('githubusercontent.com') ||
    url.hostname.includes('jsdelivr.net');
}

function getImageCacheKey(url) {
  const normalized = new URL(url);
  normalized.searchParams.delete(IMAGE_RETRY_PARAM);
  return normalized.toString();
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (isImageRequest(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const cacheKey = getImageCacheKey(request.url);
      const isRetryRequest = url.searchParams.has(IMAGE_RETRY_PARAM);
      const cachedResponse = isRetryRequest ? null : await cache.match(cacheKey);

      const fetchPromise = fetch(request, { cache: 'no-store' }).then(networkResponse => {
        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
          cache.put(cacheKey, networkResponse.clone());
        }
        return networkResponse;
      });

      if (cachedResponse) {
        event.waitUntil(fetchPromise.catch(() => null));
        return cachedResponse;
      }

      return fetchPromise.catch(async () => {
        return (await cache.match(cacheKey)) || Response.error();
      });
    })());
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        return fetch(request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
