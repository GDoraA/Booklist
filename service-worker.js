self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("gda-cache-v3").then(cache => {
      return cache.addAll([
        "/index.html",
        "/styles.css",
        "/app.js",
        "/assets/books_256.png",
        "/assets/books.png",
        "/assets/splash.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
