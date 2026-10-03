const CACHE_NAME = 'ridersbud-v6';
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

  // 1. Navigation / HTML Requests (SPA Routes like /customer-portal/profile, /customer-portal/*, etc.)
  const isHtmlRequest = request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) ||
    (!url.pathname.includes('.') && !url.pathname.startsWith('/api/'));

  if (isHtmlRequest) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.ok || networkResponse.status === 304)) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
            return networkResponse;
          }
        } catch {
          // Network failed or offline - fall back to cached shell
        }

        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match('/index.html')) || (await cache.match('/'));
        if (cached) return cached;

        try {
          const shellResponse = await fetch('/index.html');
          if (shellResponse && shellResponse.ok) {
            const copy = shellResponse.clone();
            cache.put('/index.html', copy).catch(() => {});
            return shellResponse;
          }
        } catch {
          // Last resort fallback
        }

        // Return a clean HTML offline shell rather than Response.error()
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>RidersBUD</title></head><body><div id="root"></div></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })()
    );
    return;
  }

  if (isViteInternal(url)) return;
  if (request.headers.get('upgrade') === 'websocket') return;
  if (url.pathname.match(/\.(ts|tsx|jsx|vue|svelte)$/)) return;

  const safeRespond = (promise) => {
    event.respondWith(
      promise.catch(async () => {
        try {
          return await fetch(request);
        } catch {
          return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
        }
      })
    );
  };

  if (url.pathname.startsWith('/api/')) {
    safeRespond(networkFirst(request));
    return;
  }

  if (url.pathname.includes('/fonts/')) {
    safeRespond(cacheFirst(request));
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2?|ico)$/)) {
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
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    return new Response(null, { status: 404, statusText: 'Not Found' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return new Response(null, { status: 404, statusText: 'Not Found' });
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
