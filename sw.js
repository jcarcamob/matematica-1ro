/* Service worker: permite jugar sin conexión.
   - Archivos propios: red primero (siempre la última versión) y caché si no hay internet.
   - Fuentes de Google: caché primero y se actualizan en segundo plano.
   Al publicar cambios grandes, sube VERSION para limpiar cachés antiguos. */
"use strict";
const VERSION = "v1";
const APP_CACHE = `app-${VERSION}`;
const FONT_CACHE = "fonts-v1";
const NETWORK_TIMEOUT_MS = 3000;
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "icons/favicon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, FONT_CACHE]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (FONT_HOSTS.has(url.hostname)) { event.respondWith(cacheFirst(req, FONT_CACHE)); return; }
  if (url.origin !== self.location.origin) return; // cualquier otro origen: sin intervenir

  event.respondWith(networkFirst(req, req.mode === "navigate"));
});

async function networkFirst(req, isPage) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await withTimeout(fetch(req), NETWORK_TIMEOUT_MS);
    if (res.ok && res.type === "basic") cache.put(isPage ? "index.html" : req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(isPage ? "index.html" : req, { ignoreSearch: isPage });
    return hit || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const update = fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") cache.put(req, res.clone());
    return res;
  }).catch(() => undefined);
  return hit || (await update) || new Response("", { status: 504 });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
