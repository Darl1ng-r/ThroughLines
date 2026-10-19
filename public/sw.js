const CACHE_NAME = 'throughlines-v4'

// Pre-cache the bare minimum shell assets for offline availability
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
]

// Domains/paths that must NEVER be cached (authenticated API calls, Supabase, Upstash)
const BYPASS_HOSTS = [
  'supabase.co',
  'supabase.com',
  'upstash.io',
  'pwnedpasswords.com',
  'googleapis.com',
  'accounts.google.com',
]

function shouldBypassCache(request) {
  // Never cache non-GET requests
  if (request.method !== 'GET') return true

  // Never cache requests with Authorization headers (authenticated API calls)
  if (request.headers.get('Authorization')) return true

  const url = new URL(request.url)

  // Never cache requests to external API/auth domains
  if (BYPASS_HOSTS.some(host => url.hostname.includes(host))) return true

  // Never cache Supabase REST/Auth paths
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/rest/')) return true

  return false
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.addAll(SHELL_ASSETS)
      } catch (err) {
        console.warn('SW shell pre-cache non-blocking error:', err)
      }
    })()
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((cache) => cache !== CACHE_NAME)
          .map((cache) => caches.delete(cache))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  // Skip all authenticated/API requests entirely — network only, no caching
  if (shouldBypassCache(event.request)) {
    return
  }

  // Network-first strategy for HTML navigation (ensures fresh app shell, with offline fallback)
  const url = new URL(event.request.url)
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request)
          if (networkResponse?.status === 200) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put('/index.html', networkResponse.clone())
          }
          return networkResponse
        } catch {
          const cached = await caches.match('/index.html')
          return cached || (await caches.match('/'))
        }
      })()
    )
    return
  }

  // Cache-first strategy for immutable static assets (JS, CSS, fonts with content hashes)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached

        const response = await fetch(event.request)
        if (response?.status === 200 && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(event.request, response.clone())
        }
        return response
      })()
    )
    return
  }

  // Network-first with cache fallback for everything else
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request)
        if (networkResponse?.status === 200 && networkResponse.type === 'basic') {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(event.request, networkResponse.clone())
        }
        return networkResponse
      } catch {
        return caches.match(event.request)
      }
    })()
  )
})

// -----------------------------------------------------------------------
// Web Push & Push Notification Event Listeners
// -----------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = { title: '🌿 Throughline Update', body: 'Someone nudged you for an update on your throughline!' }
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url || '/dashboard'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data || '/dashboard')
  )
})
