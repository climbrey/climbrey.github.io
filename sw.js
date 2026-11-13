const RELEASE = '8c577177913c7d9c';
const SCOPE = self.registration.scope;
const PREFIX = 'shanyue-' + new URL(SCOPE).pathname + '-';
const CACHE = PREFIX + RELEASE;
const FILES = ['index.html', 'manifest.webmanifest', 'pwa.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const URLS = FILES.map(file => new URL(file, SCOPE).href);
const INDEX = new URL('index.html', SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const base = new URL(SCOPE);
  if (url.origin !== base.origin) return;
  const clean = url.origin + url.pathname;
  const isPage = request.mode === 'navigate' && [base.href, INDEX].includes(clean);
  if (isPage) {
    // Keep a release's HTML and cached assets together. Installation of the next
    // worker prepares a complete release before the reader chooses to update.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(INDEX)).then(hit => hit || fetch(request)));
    return;
  }
  if (URLS.includes(clean)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(clean)).then(hit => hit || fetch(request)));
  }
});
