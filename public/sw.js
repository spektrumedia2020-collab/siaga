const CACHE_NAME = 'siaga-static-v3'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys().then((cacheNames) => Promise.all(
    cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))
  )).then(() => self.clients.claim())
))

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url)
  if (event.request.method !== 'GET' || requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.endsWith('.html') || requestUrl.pathname === '/') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok && requestUrl.origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      }).catch(() => cached)
      return cached || network
    })
  )
})
