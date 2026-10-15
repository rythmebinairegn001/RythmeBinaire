/* RythmeBinaireGn — service worker (mode hors connexion).
 * Principe : PRUDENT. Il ne met en cache que ce qui est sûr, et ne touche jamais aux données
 * (Supabase, fonctions, API) : celles-ci passent toujours directement par le réseau.
 *   - pages (navigation)       : réseau d'abord (4 s), sinon dernière copie connue
 *   - /assets/* (noms à hash)  : cache d'abord (le contenu ne change jamais sous un même nom)
 *   - moteur Python (jsdelivr) : cache d'abord (≈ 10 Mo, téléchargé une seule fois)
 * Interrupteur de secours : ouvrir le site avec ?nosw=1 désinstalle tout (voir src/lib/offline.ts).
 */
const VERSION = 'v1';
const PAGES = 'rb-pages-' + VERSION;
const ASSETS = 'rb-assets-' + VERSION;
const PYODIDE = 'rb-pyodide-' + VERSION;
const KEEP = [PAGES, ASSETS, PYODIDE];
const PYODIDE_PREFIX = 'https://cdn.jsdelivr.net/pyodide/';
const MAX_ASSETS = 80;
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('rb-') && !KEEP.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (res && res.ok) cache.put('/index.html', res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    return new Response('<!doctype html><meta charset="utf-8"><title>Hors connexion</title><body style="font-family:sans-serif;padding:2rem"><h1>Hors connexion</h1><p>Ouvre RythmeBinaireGn une fois avec internet pour pouvoir l\'utiliser ensuite sans connexion.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // On garde les réponses correctes (ou « opaques » du moteur Python, chargé par importScripts)
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(request, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.href.startsWith(PYODIDE_PREFIX)) {
    event.respondWith(cacheFirst(req, PYODIDE, 0));
    return;
  }
  if (url.origin !== self.location.origin) return; // Supabase, polices, etc. : jamais touchés

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstPage(req));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(req, ASSETS, MAX_ASSETS));
  }
});

// Préparation du moteur Python à la demande (l'élève choisit, car ≈ 10 Mo)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'PREFETCH' || !Array.isArray(data.urls)) return;
  const port = event.ports && event.ports[0];
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PYODIDE);
      let done = 0;
      for (const u of data.urls) {
        if (typeof u !== 'string' || !u.startsWith(PYODIDE_PREFIX)) continue;
        try {
          if (!(await cache.match(u))) {
            const res = await fetch(u, { mode: 'cors' });
            if (!res.ok) throw new Error('http ' + res.status);
            await cache.put(u, res);
          }
          done++;
          if (port) port.postMessage({ type: 'progress', done, total: data.urls.length });
        } catch (e) {
          if (port) port.postMessage({ type: 'error', url: u });
          return;
        }
      }
      if (port) port.postMessage({ type: 'done' });
    })()
  );
});
