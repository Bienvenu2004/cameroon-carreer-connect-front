/**
 * Service worker for JobsConnect CMR.
 *
 * The platform's stated purpose is to work on the metered 2G/3G connections most
 * Cameroonian users are on. Code splitting took the first load from about 350 kB
 * gzipped down to 185 kB; this is the next step, and it targets the two things
 * splitting cannot help with:
 *
 *   1. Repeat visits. The app shell and its hashed asset chunks never change
 *      between deploys, so a returning visitor should pay for almost nothing.
 *   2. A connection that drops mid-scroll. The last set of job results is kept
 *      so the listing still renders something rather than an error page.
 *
 * Two deliberate limits:
 *
 *   - Only GET requests to our own origin are touched. Nothing authenticated is
 *     written to the cache beyond the job listing, and no mutation ever is:
 *     serving a stale profile or a replayed application would be far worse than
 *     a spinner.
 *   - Navigation requests fall back to the cached shell, so a deep link opened
 *     offline still boots the app instead of showing the browser's error page.
 */

const VERSION = "v2";
const SHELL_CACHE = `jcc-shell-${VERSION}`;
const ASSET_CACHE = `jcc-assets-${VERSION}`;
const DATA_CACHE = `jcc-data-${VERSION}`;

/** Kept small on purpose: this is a fallback, not an offline archive. */
const MAX_DATA_ENTRIES = 30;

const SHELL_URLS = [
  "/",
  "/index.html",
  // Brand assets change only when the logo does, so they belong with the shell
  // rather than being refetched on every visit.
  "/logo/logo-full.png",
  "/logo/favicon-32.png",
  "/site.webmanifest",
];

/** Read-only endpoints worth keeping a copy of. */
const CACHEABLE_DATA = [
  "/api/hjp/jobs/all",
  "/api/hjp/jobs/search",
  "/api/hjp/companies",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      // A failed precache must not leave a broken worker installed.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, DATA_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

/** Trim a cache to its newest N entries, oldest first. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

/**
 * Cache-first. Correct only for Vite's hashed asset filenames, where the URL
 * changes whenever the content does — so a cache hit can never be stale.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    void cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first with a cached fallback. Everyone online sees live data; someone
 * whose connection just dropped sees the last listing they loaded instead of an
 * error page.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      void cache.put(request, response.clone());
      void trim(cacheName, MAX_DATA_ENTRIES);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A deep link opened offline should still boot the app.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Hashed build output: the URL changes whenever the content does.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Brand assets are not content-hashed, but they change about as often as the
  // company does. Cache-first here is what makes precaching them worth anything;
  // without it the fetch handler would ignore /logo/ and the browser would go to
  // the network for the header logo on every single page load.
  if (url.pathname.startsWith("/logo/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (CACHEABLE_DATA.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  }
});
