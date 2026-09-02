const CACHE_NAME = "cripqer-brand-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/brand-assets/cripqer-favicon-16.png",
  "/brand-assets/cripqer-favicon-32.png",
  "/brand-assets/cripqer-favicon.png",
  "/brand-assets/cripqer-apple-touch-180.png",
  "/brand-assets/cripqer-icon-192.png",
  "/brand-assets/cripqer-icon-512.png",
  "/brand-assets/cripqer-maskable-192.png",
  "/brand-assets/cripqer-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Ignorar peticiones a supabase o APIs de terceros
  if (!event.request.url.startsWith(self.location.origin)) return;
  // Ignorar peticiones que no sean GET
  if (event.request.method !== "GET") return;

  // Si es una petición de navegación (HTML), usar Network First
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback al inicio si está offline y no hay cache exacta
            return caches.match("/");
          });
        }),
    );
    return;
  }

  // Para otros assets, usar Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => null); // Ignorar fallos de red silenciosamente

      return cachedResponse || fetchPromise;
    }),
  );
});
