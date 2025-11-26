// JAVÍTÁS: új cache név (v6), hogy a régi app.js ne maradjon a cache-ben
const CACHE_NAME = "gda-cache-v6";

// JAVÍTÁS: relatív útvonalak, hogy /GDA_booklist/ alatt is működjön
const ASSETS_TO_CACHE = [
  "index.html",
  "styles.css",
  "app.js",
  "assets/books_256.png",
  "assets/books.png",
  "assets/splash.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// JAVÍTÁS: régi cache-ek törlése, hogy ne maradjon bent régi app.js
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // csak az aktuális marad
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
