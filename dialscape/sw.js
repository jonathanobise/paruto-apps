// Dialscape works offline: the app shell is cached on install and served cache-first, refreshed in the background.
const VERSION = "dialscape-v1";
const SHELL = [
  "./", "index.html", "style.css", "fonts.css", "app.js", "engine.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "fonts/instrument-serif.woff2", "fonts/instrument-serif-italic.woff2", "fonts/space-grotesk.woff2",
  "fonts/dm-mono-300.woff2", "fonts/dm-mono-400.woff2", "fonts/unbounded.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dialscape-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit || (req.mode === "navigate" ? cache.match("index.html") : Response.error()));
      return hit || fresh;
    }),
  );
});
