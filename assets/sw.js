/**
 * Service Worker for AT CIRCLE Companion Navigation
 * Basic App Shell caching for standalone PWA mode.
 */

const CACHE_NAME = "atcircle-companion-v2";

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
    // Only cache static assets (not dynamic ATProto API or SSR HTML)
    const url = new URL(event.request.url);
    if (url.pathname.startsWith("/assets/")) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return (
                    cachedResponse ||
                    fetch(event.request).then((response) => {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    })
                );
            }),
        );
    }
});
