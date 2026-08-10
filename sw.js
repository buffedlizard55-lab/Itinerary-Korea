/* Korea Compass service worker.
 * Makes the planner usable offline (important when roaming in Korea) by
 * caching the app shell and research data. Bump CACHE_VERSION whenever the
 * precache list changes so stale caches are retired on the next visit.
 */
"use strict";

const CACHE_VERSION = "korea-compass-v2";
const SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./assets/app.css",
  "./assets/app.js",
  "./assets/compass.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./data/index.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations: network first, offline shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Research data: stale-while-revalidate so updates arrive quietly.
  if (url.pathname.includes("/data/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  // Everything else (styles, script, icons): cache first, fill on miss.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
