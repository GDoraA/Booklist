// Azonnali SW aktiválás
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Cache verzió
const CACHE_NAME = "gda-cache-v11";

// Cache-elendő statikus fájlok
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",

  "./assets/books_256.png",
  "/assets/books_256.png",

  "./assets/books.png",
  "/assets/books.png",

  "./assets/splash.png",
  "/assets/splash.png"
];

// Telepítés
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Aktiválás – régi cache-ek törlése
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// FETCH LOGIKA – GOOGLE SCRIPT BYPASS + CACHE-FIRST
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const requestPath = url.pathname;

  // Google Apps Script API hívások bypass
  if (
    request.url.includes("script.google.com") ||
    request.url.includes("googleusercontent.com")
  ) {
    return;
  }

  // Mindig frissen töltendő fájlok
  const freshPaths = [
    "/index.html",
    "/app.js",
    "/manifest.json"
  ];

  if (freshPaths.includes(requestPath)) {
    return event.respondWith(fetch(request));
  }

  // Cache-first stratégia
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).catch(() => {
        return caches.match("./index.html");
      });
    })
  );
});
