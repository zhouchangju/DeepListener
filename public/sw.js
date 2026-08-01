/*
 * DeepListener service worker.
 *
 * Why this exists: the app is marketed as local-first / self-hosted, but the
 * previous SW had an empty fetch handler. That meant a user who installed the
 * PWA lost everything the moment the network dropped — even though all their
 * media lives on the same host. This SW closes that gap with a conservative
 * caching strategy:
 *
 *   - App shell (HTML navigations, /_next static, built JS/CSS):
 *       network-first with a cache fallback. This prevents a long-lived local
 *       install from mixing fresh markup with stale styles while preserving
 *       offline startup.
 *   - Uploaded media (/uploads/*, /videos/*) and icons:
 *       cache-first. These are local user data on the same origin; serving
 *       them from the cache avoids a second download and makes practice work
 *       fully offline.
 *   - API routes (/api/*) and all non-GET requests:
 *       network-only. Never cache mutations or live data.
 *   - Anything else that fails offline:
 *       fall back to the cached app shell so the UI renders instead of the
 *       browser's default offline dinosaur.
 *
 * Safety: this SW only intercepts same-origin GET requests. It never touches
 * cross-origin traffic, never caches POST/PUT/PATCH/DELETE, and never serves
 * stale data for /api/*. Shell and media caches are versioned independently
 * so style updates do not evict already-downloaded user media.
 */

const SHELL_CACHE_VERSION = "v2";
const MEDIA_CACHE_VERSION = "v1";
const SHELL_CACHE = `deeplistener-shell-${SHELL_CACHE_VERSION}`;
const MEDIA_CACHE = `deeplistener-media-${MEDIA_CACHE_VERSION}`;

// App-shell assets to precache on install so the very first offline load works.
// Keep this list minimal and stable; everything else is cached on demand.
const PRECACHE_URLS = [
  "/",
  "/library",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

const MEDIA_PATH_PREFIXES = ["/uploads/", "/videos/", "/icon-"];
const APP_STATIC_PATH_PREFIXES = ["/_next/static/"];
const NEVER_CACHE_PREFIXES = ["/api/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort precache — ignore individual failures so a missing icon
      // does not block the install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== MEDIA_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow the page to ask a waiting worker to activate immediately so users get
// the latest version on the next reload rather than waiting for all tabs to
// close.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle same-origin GETs. POST/PATCH/DELETE and cross-origin
  // (transcription providers, etc.) always go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — they must always be fresh.
  if (NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  // HTML navigations: network-first with shell fallback so users get fresh
  // content when online and a usable app offline instead of an error page.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithShellFallback(request));
    return;
  }

  // User media + icons: cache-first (this is local data).
  if (MEDIA_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  // Built JS/CSS must prefer the current server response. In development,
  // Next can reuse chunk URLs between edits; cache-first would keep an old
  // stylesheet indefinitely and make existing DOM appear empty or unstyled.
  if (APP_STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(networkFirstWithCacheFallback(request, SHELL_CACHE));
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — there's nothing useful to return for media.
    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirstWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

async function networkFirstWithShellFallback(request) {
  try {
    const response = await fetch(request);
    // Cache successful navigations so they're available offline next time.
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — fall back to a cached navigation, or the root shell.
    const cache = await caches.open(SHELL_CACHE);
    const cachedNav = await cache.match(request);
    if (cachedNav) return cachedNav;
    const root = await cache.match("/");
    if (root) return root;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
