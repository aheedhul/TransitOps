const CACHE_NAME = 'transitops-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isApi = url.pathname.startsWith('/api/');
  const isMutation = event.request.method !== 'GET';

  if (isApi && !isMutation) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isApi && isMutation) {
    return;
  }

  if (event.request.destination === 'document' || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(3000) });
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'No network connection' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? fetchPromise ?? new Response('', { status: 503 });
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FLUSH_OUTBOX') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TRIGGER' });
        });
      })
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-outbox') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TRIGGER' });
        });
      })
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title ?? 'TransitOps';
    const options = {
      body: data.message ?? '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.payload ?? {},
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // ignore non-JSON push payloads
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const matching = clients.find((c) => c.url.includes(route) || route === '/');
      if (matching) {
        matching.focus();
        matching.postMessage({ type: 'NOTIFICATION_CLICK', payload: event.notification.data, route });
        if (route !== '/' && !matching.url.includes(route)) {
          matching.navigate(route);
        }
      } else if (clients.length > 0) {
        const client = clients[0];
        client.focus();
        client.navigate(route);
        client.postMessage({ type: 'NOTIFICATION_CLICK', payload: event.notification.data, route });
      } else {
        self.clients.openWindow(route);
      }
    })
  );
});
