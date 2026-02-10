// sw.js - V3.6.1 圖片快取增強版
const CACHE_NAME = 'ttl-pwa-v22'; // App 核心快取
const IMAGE_CACHE_NAME = 'ttl-images-v1'; // 專門存圖片的快取
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './LOGO.png',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

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
          // 清除舊版本的核心快取，但保留圖片快取(以免更新版本後圖片要重抓)
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
  const url = new URL(event.request.url);

  // [策略 1] 針對圖片：Stale-While-Revalidate (優先用舊圖，背景偷偷更新)
  // 判斷條件：副檔名是圖片，或是來自 GitHub/JSDelivr 的圖片請求
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i) || 
      url.hostname.includes('githubusercontent.com') || 
      url.hostname.includes('jsdelivr.net')) {
      
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // 如果網路抓取成功，更新快取
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // 網路失敗時，什麼都不做(依靠快取)
          });

          // 如果有快取，直接回傳快取 (讓使用者覺得超快)
          // 同時背景執行 fetchPromise 更新快取
          return cachedResponse || fetchPromise;
        });
      })
    );
    return; // 結束，不執行下面的邏輯
  }

  // [策略 2] 針對 App 核心檔案：Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});