// Rockbox — service worker
// Cachea la app (HTML + manifest) para que abra y funcione sin Internet
// una vez que se instaló/visitó al menos una vez. La música y los ajustes
// del usuario siguen viviendo en IndexedDB (no se tocan acá).

const CACHE_NAME = 'rockbox-shell-v1';
const APP_SHELL = [
  './',
  './rockbox.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // si algún archivo no existe en ese path, no rompe la instalación
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia: cache primero (arranque instantáneo y offline real),
// y de paso actualiza la copia en caché si hay red disponible.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // no cachear nada externo

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
