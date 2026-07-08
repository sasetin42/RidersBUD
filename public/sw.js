const CACHE_NAME = 'ridersbud-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/riders-logo.png'
];

// Immediately self-destruct on localhost (dev mode) to prevent stale SW errors
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.registration?.unregister();
  // Don't register any event handlers in dev mode
} else {

// Handle message events without indicating async — prevents "listener indicated" errors
self.addEventListener('message', (event) => {
  event.waitUntil(Promise.resolve());
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

function isViteInternal(url) {
  return url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/__vite') ||
    url.search.includes('t=');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;
  if (request.method !== 'GET') return;

  // Handle navigation/HTML requests by falling back to index.html when offline
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/')) || (await cache.match('/index.html')) || Response.error();
        })
    );
    return;
  }

  if (request.mode === 'navigate') return;
  if (isViteInternal(url)) return;
  if (request.headers.get('upgrade') === 'websocket') return;
  if (url.pathname.match(/\.(ts|tsx|jsx|vue|svelte)$/)) return;

  const safeRespond = (p) => {
    const safe = p.catch(() => Response.error());
    event.respondWith(safe);
    event.waitUntil(safe.catch(() => {}));
  };

  if (url.pathname.startsWith('/api/')) {
    safeRespond(networkFirst(request));
    return;
  }

  if (url.pathname.includes('/fonts/')) {
    safeRespond(cacheFirst(request));
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|svg|woff2?|ico)$/)) {
    safeRespond(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.match(/\.(js|css)$/)) {
    safeRespond(networkFirst(request));
    return;
  }

  safeRespond(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response || Response.error();
  } catch {
    return Response.error();
  }
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'RidersBud', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

} // end of self-destruct conditional (localhost dev mode)
