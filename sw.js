// ============================================
// BASHIRI NASI - SERVICE WORKER
// ============================================

const CACHE_NAME = 'bashiri-nasi-v3';

// Install event
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Installing...');
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', function(event) {
    console.log('🚀 Service Worker: Activated');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', function(event) {
    // Skip API calls and non-GET requests
    if (event.request.method !== 'GET') return;
    if (event.request.url.indexOf('/api/') !== -1) return;
    
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Cache successful responses
                if (response && response.status === 200) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // Offline - try cache
                return caches.match(event.request).then(function(cachedResponse) {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return offline page for HTML requests
                    if (event.request.headers.get('accept') && 
                        event.request.headers.get('accept').indexOf('text/html') !== -1) {
                        return caches.match('/bashiri-nasi/offline.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

console.log('✅ Service Worker Ready');