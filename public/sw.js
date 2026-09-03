// Service worker mínimo: solo lo necesario para que Chrome habilite
// "Instalar app". No cachea agresivamente para no mostrar precios o stock
// desactualizados — cada visita sigue pidiendo datos frescos al servidor.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
