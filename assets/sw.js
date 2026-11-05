/**
 * Service Worker for AT CIRCLE Companion Navigation
 * Basic App Shell caching for standalone PWA mode.
 */

const CACHE_NAME = "atcircle-companion-v3";

const APP_SHELL_ASSETS = [
    "/assets/favicon.png",
    "/assets/index.css",
    "/assets/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL_ASSETS);
        }),
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Only cache GET requests for static assets (not dynamic ATProto API or SSR HTML)
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    if (url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Validate response before caching (status 200 and basic type)
                        if (
                            response &&
                            response.status === 200 &&
                            response.type === "basic"
                        ) {
                            const responseToCache = response.clone();
                            // Asynchronous cache update without blocking response return
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache).catch(() => {});
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline cached response if available or fallback
                        return caches.match(event.request);
                    });
            }),
        );
    }
});
