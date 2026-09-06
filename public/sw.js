const CACHE_NAME = 'throughlines-v2'

// Only pre-cache the bare minimum shell assets
const SHELL_ASSETS = [
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
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Purge all old cache versions on activate
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Skip all authenticated/API requests entirely — network only, no caching
  if (shouldBypassCache(event.request)) {
    return
  }

  // Network-first strategy for HTML navigation (ensures fresh app shell)
  const url = new URL(event.request.url)
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Cache-first strategy for immutable static assets (JS, CSS, fonts with content hashes)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first with cache fallback for everything else
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => caches.match(event.request))
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
    } catch (_) {
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
