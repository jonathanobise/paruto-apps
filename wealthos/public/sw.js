/*
 * WealthOS service worker. Privacy first: it NEVER caches pages, API responses or anything that
 * could contain financial or personal data. The only cached file is a static offline page shown
 * when a navigation fails because the device is offline.
 */
const CACHE = "wealthos-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // everything else goes straight to the network
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then((c) => c.match(OFFLINE))));
});
