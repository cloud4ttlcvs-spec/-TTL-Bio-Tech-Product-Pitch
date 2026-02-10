/* sw.js - 強制更新版 */
const CACHE_NAME = 'ttl-pwa-v27'; // 升級版本號
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './LOGO.png',  // [重要] 記得把新圖片加入快取清單
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

self.addEventListener('install', event => {
  // [強制更新關鍵] 這裡取消註解 skipWaiting，讓新版本直接安裝
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
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // [強制接管] 讓新版 Service Worker 立即控制頁面
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 開發階段建議：如果網路有新版，優先抓網路，失敗才抓快取 (Network First)
        // 但為了穩定性，我們先維持 Cache First，靠上面的 skipWaiting 強制更新
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




