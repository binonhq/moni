/* Only public shell files and content-hashed Next assets enter this cache. */
const VERSION = "moni-shell-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/maskable-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
  // An update waits until the user accepts it or all old windows close.
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("moni-shell-") && k !== VERSION).map(k => caches.delete(k)))), self.clients.claim()]));
});
self.addEventListener("message", event => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache API, auth, RSC/prefetch payloads, or authenticated page HTML.
  if (url.pathname.startsWith("/api/") || request.headers.has("RSC") || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || Response.error()));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") && !url.search || SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(VERSION).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    }));
  }
});
