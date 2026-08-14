/*
 * StudyOS service worker — conservative, privacy-first.
 *
 * - Precaches only the static offline fallback page.
 * - Runtime-caches same-origin *static assets* (Next build output, icons,
 *   fonts) with a cache-first strategy for instant repeat loads / standalone.
 * - Navigations are network-first; when offline, they fall back to the static
 *   offline page — authenticated HTML is NEVER stored (so a shared device can't
 *   serve one user's cached page to another).
 * - API routes, AI requests, auth, and any non-GET / cross-origin request are
 *   passed straight to the network (never cached). AI is never faked offline.
 */
const VERSION = "v1";
const STATIC_CACHE = `studyos-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never touch API/auth/AI traffic.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, offline → static fallback (no authed HTML cached).
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: cache-first with background refresh.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
