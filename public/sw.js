// Hand-rolled service worker — no next-pwa/Workbox. This project builds on Turbopack, and
// most PWA plugins in that space are webpack-plugin-based, which the AGENTS.md warning about
// this Next.js version's breaking changes makes a real compatibility risk not worth taking for
// a cache layer this simple to write directly.
const CACHE_NAME = "fluent-pdf-v1";

// Stable route/asset URLs (not build-hashed chunk filenames, which Turbopack regenerates every
// build and can't be reliably enumerated here) — precached on install so the six tools and the
// PDF worker/standard fonts work offline from the very first visit, before the user has ever
// used them online. Everything else (hashed JS/CSS chunks, fonts, cmaps, etc.) is handled by the
// runtime cache-as-you-go strategy below instead: available offline once fetched at least once.
const PRECACHE_URLS = [
  "/",
  "/app/merge",
  "/app/split",
  "/app/edit",
  "/app/fields",
  "/app/protect",
  "/app/images",
  "/manifest.webmanifest",
  "/pwa-icon-192",
  "/pwa-icon-512",
  "/pwa-icon-maskable-512",
  "/pdf.worker.min.mjs",
  "/standard_fonts/FoxitDingbats.pfb",
  "/standard_fonts/FoxitFixed.pfb",
  "/standard_fonts/FoxitFixedBold.pfb",
  "/standard_fonts/FoxitFixedBoldItalic.pfb",
  "/standard_fonts/FoxitFixedItalic.pfb",
  "/standard_fonts/FoxitSerif.pfb",
  "/standard_fonts/FoxitSerifBold.pfb",
  "/standard_fonts/FoxitSerifBoldItalic.pfb",
  "/standard_fonts/FoxitSerifItalic.pfb",
  "/standard_fonts/FoxitSymbol.pfb",
  "/standard_fonts/LiberationSans-Bold.ttf",
  "/standard_fonts/LiberationSans-BoldItalic.ttf",
  "/standard_fonts/LiberationSans-Italic.ttf",
  "/standard_fonts/LiberationSans-Regular.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // allSettled, not all — one route failing to precache (e.g. a dev-only hiccup) shouldn't
      // abort the whole install and leave nothing cached at all.
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: always prefer a live response when online (so users see current content, not
  // a stale cached copy), caching every successful response as it comes in. Falls back to
  // whatever's cached only when the network request itself fails (i.e. offline).
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
