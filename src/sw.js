// Catcha service worker: installability + offline play.
// index.html is network-first (so deploys show up on reload); hashed assets and images are cache-first.
// __VERSION__ is replaced at build time, so each deploy produces a new worker and the page can offer a reload.
const VERSION = 'catcha-__VERSION__';
const ART = 'catcha-art';   // Pal and item images: identical across deploys, so they are kept when a new worker takes over
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  // No skipWaiting here: the new worker waits until the page asks (user clicked "Reload").
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== ART).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Revalidate the shell: GitHub Pages serves index.html with a 10-minute max-age, and a stale shell
    // would point at old bundles even after a new worker took over.
    event.respondWith(
      fetch(new Request(req, { cache: 'no-cache' })).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./', copy)); return res; })
        .catch(() => caches.match('./')),
    );
    return;
  }

  const bucket = /\/(pals|items|map)\/[^/]+\.(png|webp)$/.test(new URL(req.url).pathname) ? ART : VERSION;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(bucket).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
