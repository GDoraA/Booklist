// Azonnali SW aktiválás
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Cache verzió
const CACHE_NAME = "gda-cache-v12";

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
// ---------- SERVICE WORKER VERZIÓ LEKÉRÉSE ----------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(reg => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage("GET_SW_VERSION");
        }
    });

    navigator.serviceWorker.addEventListener("message", event => {
        if (event.data && event.data.swVersion) {
            const el = document.getElementById("swVersion");
            if (el) el.textContent = event.data.swVersion;
        }
    });
}
// ------------------------------------------------------
