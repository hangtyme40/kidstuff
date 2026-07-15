// KidStuff Service Worker
// Bump CACHE_VERSION with every deployment to force all devices to reload
const CACHE_VERSION = '202607151252';
const CACHE_NAME = 'kidstuff-' + CACHE_VERSION;

// Handle skip waiting message from the page
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Files to cache on install
const PRECACHE_FILES = [
  '/',
  '/index.html'
];

// Install — cache core files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_FILES);
    }).then(function() {
      // Force this service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// Activate — delete all old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// Fetch — network first, fall back to cache
// This ensures users always get the latest version when online,
// and the cached version when offline
self.addEventListener('fetch', function(event) {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For index.html: always try network first, never serve stale
  const isHtml = event.request.url.endsWith('/') ||
                 event.request.url.endsWith('/index.html') ||
                 event.request.url === self.location.origin + '/';

  if (isHtml) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        // Update cache with fresh response
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // Offline — serve cached version
        return caches.match(event.request);
      })
    );
    return;
  }

  // For everything else: cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
