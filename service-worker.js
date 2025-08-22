// ---- Safe Life CCP Referral — Service Worker ----
// Strategy:
// - DO NOT intercept Netlify Functions: /.netlify/functions/*
// - Network-first for HTML/nav requests (fresh app)
// - Stale-while-revalidate for static assets (fast + updated in background)

const CACHE_NAME = 'safe-life-cache-v3';
const PRECACHE_URLS = [
  '/',             // HTML entry
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon1.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache: 'reload' ensures the SW fetches a fresh copy
    await cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
    // Activate this SW immediately
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Remove old caches
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// Helper: stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(response => {
    // Only cache same-origin, OK responses
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);

  return cached || networkPromise || new Response('', { status: 504, statusText: 'Gateway Timeout' });
}

// Helper: network-first for HTML (fallback to cache if offline)
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Never touch Netlify Functions (critical for email/send reliability)
  if (url.pathname.startsWith('/.netlify/functions/')) {
    // Let the network handle it; no respondWith
    return;
  }

  // 2) Don’t cache non-GET requests
  if (req.method !== 'GET') return;

  // 3) Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // 4) HTML / navigations: network-first
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 5) Static assets: stale-while-revalidate
  const isStatic =
    PRECACHE_URLS.includes(url.pathname) ||
    /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|gif|woff2?)$/i.test(url.pathname);

  if (isStatic) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 6) Everything else: fall through to network
});

// Optional: enable immediate activation from the page
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
