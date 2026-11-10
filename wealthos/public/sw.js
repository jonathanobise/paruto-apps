/*
 * WealthOS service worker. Privacy first: it NEVER caches pages, API responses or anything that
 * could contain financial or personal data. The only cached file is a static offline page shown
 * when a navigation fails because the device is offline.
 */
const CACHE = "wealthos-offline-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([new Request(OFFLINE, { cache: "reload" }), new Request("/icons/icon-192.png", { cache: "reload" })])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // everything else goes straight to the network
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then((c) => c.match(OFFLINE))));
});

// The offline page's icon (not financial data) is the only other file kept.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" || new URL(event.request.url).pathname !== "/icons/icon-192.png") return;
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then((c) => c.match("/icons/icon-192.png"))));
});
