// 🔧 Azonnali SW aktiválás – NE várjon újraindításra
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
// 🔥 KÖTELEZŐ VERZIÓSZÁM MÓDOSÍTÁS – ÍGY TŐLÜNK IDŐSZERŰ MARAD
const CACHE_NAME = "gda-cache-v10";

// 🔒 Csak statikus képek és ikonok kerüljenek cache-be
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",

  // képek – manifest ikonok + splash teljes URL path támogatással
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

  // Azonnali SW aktiválás
  return self.clients.claim();
});

// FETCH LOGIKA
self.addEventListener("fetch", event => {
  const request = event.request;

    // 🔧 PONTOS path alapú ellenőrzés – csak az adott fájlokra
    const freshPaths = [
      "/index.html",
      "/app.js",
      "/manifest.json"
    ];

    const url = new URL(event.request.url);
    const requestPath = url.pathname;

    // Ha pontos egyezés van → hálózatról frissen töltjük
    if (freshPaths.includes(requestPath)) {
      return event.respondWith(fetch(event.request));
    }


  // Statikus képek cache-ből
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;  // talált a cache-ben
      }
      return fetch(request);     // különben megy hálózatra
    })
  );
});
