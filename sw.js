// Service worker: makes the app installable and usable offline.
// Bump CACHE_VERSION whenever you want every device to drop old cached files.
const CACHE_VERSION = "v1";
const CACHE = `ida-tracker-${CACHE_VERSION}`;
const SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "js/config.js",
  "js/data.js",
  "js/db.js",
  "js/auth.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];
const CDN_HOST = "cdn.jsdelivr.net";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("ida-tracker-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Supabase API calls (auth + database) always go straight to the network.
  if (url.hostname.endsWith(".supabase.co")) return;

  // Pinned Supabase library from the CDN: cache-first so the app starts offline.
  if (url.hostname === CDN_HOST) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pages and files from this site: network first, cached copy when offline.
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
