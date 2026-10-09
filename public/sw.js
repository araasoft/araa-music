const CACHE_NAME = "araamusic-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Passthrough for now — just needs to exist and control the page.
  event.respondWith(fetch(event.request));
});