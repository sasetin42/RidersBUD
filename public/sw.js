const CACHE_NAME = 'ridersbud-pwa-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/leaflet/leaflet.css',
  '/leaflet/MarkerCluster.css',
  '/leaflet/MarkerCluster.Default.css'
];

// URLs/patterns that must NEVER be cached by the service worker
const SECURITY_EXCLUSIONS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebaseinstallations.googleapis.com',
  '/api/hitpay-proxy',
  '/api/hitpay-webhook',
  '/payment/webhook',
  '/api/smtp-bridge',
  'hit-pay.com',
  'stripe.com',
  'pusher.com',
  'evervault.com',
  'accounts:lookup'
];

function isSecurityExcluded(urlStr) {
  return SECURITY_EXCLUSIONS.some(term => urlStr.includes(term));
}

// Development safeguard: Immediately unregister and bypass on localhost
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.registration?.unregister();
} else {

  // Communication message channel handling
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  // Installation: Pre-cache static shell & offline fallback
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Non-critical static cache warning:', err);
        });
      })
    );
    self.skipWaiting();
  });

  // Activation: Clean up obsolete caches and claim clients immediately
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }).then(() => self.clients.claim())
    );
  });

  // Helper to detect Vite HMR / internal files
  function isViteInternal(url) {
    return url.pathname.startsWith('/@vite') ||
      url.pathname.startsWith('/@react-refresh') ||
      url.pathname.startsWith('/__vite') ||
      url.search.includes('t=');
  }

  // Fetch interceptor
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Bypass non-GET requests immediately (mutations, posts, payments, webhook calls)
    if (request.method !== 'GET') return;

    // Strict Security Exclusions: Auth tokens, payment gateways, live cloud functions
    if (isSecurityExcluded(request.url)) return;

    // WebSocket or Vite development channels
    if (request.headers.get('upgrade') === 'websocket') return;
    if (isViteInternal(url)) return;
    if (url.pathname.match(/\.(ts|tsx|jsx|vue|svelte)$/)) return;

    // 1. Navigation / HTML Requests (SPA Routes like /customer-portal/*, /mechanic-portal/*, etc.)
    const isNavigation = request.mode === 'navigate' ||
      (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

    if (isNavigation) {
      event.respondWith(
        (async () => {
          try {
            // Network-first for navigations so users always get fresh app updates
            const networkResponse = await fetch(request);
            if (networkResponse && (networkResponse.ok || networkResponse.status === 304)) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
              return networkResponse;
            }
          } catch {
            // Network failed or offline - fall back to cached application shell
          }

          const cache = await caches.open(CACHE_NAME);
          const cachedShell = (await cache.match('/index.html')) || (await cache.match('/'));
          if (cachedShell) return cachedShell;

          // If index shell is not cached, return branded offline.html
          const offlineFallback = await cache.match('/offline.html');
          if (offlineFallback) return offlineFallback;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>RidersBUD Offline</title></head><body style="background:#0A0A0C;color:#FFF;text-align:center;padding:40px;font-family:sans-serif;"><h1>RidersBUD Offline</h1><p>Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })()
      );
      return;
    }

    // 2. Only cache same-origin assets or specific static CDNs (e.g. google fonts, openstreetmap tiles)
    const isSameOrigin = url.origin === location.origin;
    const isFontCdn = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

    if (!isSameOrigin && !isFontCdn) {
      return;
    }

    // 3. Static Assets (images, fonts, css, scripts)
    // Stale-While-Revalidate for images and fonts
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2?|ico)$/) || isFontCdn) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(request);
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          }).catch(() => null);

          return cached || (await fetchPromise) || new Response(null, { status: 404 });
        })
      );
      return;
    }

    // Network-First for JS and CSS bundles with cache fallback (to prevent stale version locking)
    if (url.pathname.match(/\.(js|css)$/)) {
      event.respondWith(
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        }).catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
        })
      );
      return;
    }

    // Default: fetch from network
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(null, { status: 504, statusText: 'Gateway Timeout' });
      })
    );
  });

  // Push notifications handling
  self.addEventListener('push', (event) => {
    let payload = { title: 'RidersBUD', body: 'New notification', url: '/' };
    try {
      if (event.data) {
        payload = Object.assign(payload, event.data.json());
      }
    } catch {
      if (event.data) payload.body = event.data.text();
    }

    const options = {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: payload.url || '/' }
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  });

} // end conditional
