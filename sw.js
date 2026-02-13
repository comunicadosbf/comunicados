// sw.js
self.addEventListener("install", function(event) {
  console.log("Service Worker instalado.");
  self.skipWaiting(); // no esperamos a activar
});
self.addEventListener("fetch", function(event) {
  // no hace nada especial (no hay caché offline)
});
