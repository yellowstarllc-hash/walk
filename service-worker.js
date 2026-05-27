// Yellow Star Daily Walk — offline cache
// Bump this version any time index.html changes to force a refresh on devices.
const CACHE = "yellowstar-walk-v3";

const PRECACHE = [
  "./",
  "./index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Use no-cors for cross-origin scripts so they cache as opaque responses.
      Promise.all(PRECACHE.map(url =>
        fetch(new Request(url, { mode: url.startsWith("http") ? "no-cors" : "same-origin" }))
          .then(resp => cache.put(url, resp))
          .catch(err => console.warn("precache miss", url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Strategy: cache-first for the page + libs, with network fallback that updates the cache.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Only cache 200s and opaque (cross-origin no-cors) responses
        if (resp && (resp.status === 200 || resp.type === "opaque")) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
        }
        return resp;
      }).catch(() => cached); // last-ditch
    })
  );
});
