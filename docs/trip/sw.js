// Detect environment
const isProduction = self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1';
const BASE_PATH = isProduction ? '/trip' : '';

const CACHE_NAME = 'travlr-cache-v36';
const OFFLINE_URL = BASE_PATH + '/offline.html';
const urlsToCache = [
    BASE_PATH + '/',
    BASE_PATH + '/index.html',
    BASE_PATH + '/app.js',
    BASE_PATH + '/app.css',
    BASE_PATH + '/js/db.js',
    BASE_PATH + '/manifest.json',
    BASE_PATH + '/itinerary.json',
    'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
    'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/advancedFormat.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker installed');
        // Force the waiting service worker to become the active service worker
        self.skipWaiting();
        // Notify clients of the update
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              message: 'Service worker updated'
            });
          });
        });
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      // Claim control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // Handle navigation requests - always serve index.html for the base path
  if (event.request.mode === 'navigate') {
    const url = new URL(event.request.url);

    // For any navigation to /trip/* paths, serve index.html
    if (url.pathname.startsWith('/trip')) {
      event.respondWith(
        caches.match(BASE_PATH + '/index.html')
          .then((response) => {
            if (response) {
              return response;
            }
            // If not in cache, try to fetch it
            return fetch(BASE_PATH + '/index.html')
              .catch(() => {
                // If that fails, try the offline page
                return caches.match(OFFLINE_URL);
              });
          })
      );
      return;
    }
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((response) => {
            // Cache the new response
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          });
      })
      .catch(() => {
        // Return offline page or fallback content
        return caches.match(OFFLINE_URL) || new Response('You are offline. Please check your connection.');
      })
  );
});
