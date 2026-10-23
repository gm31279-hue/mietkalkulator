/* Stölner Mietkalkulator – Service Worker: App-Shell offline verfügbar, Updates online automatisch */
const CACHE = 'mietkalkulator-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; /* Fonts etc.: Browser-Standard */
  /* Navigation & HTML: erst Netz (frische Version), offline aus dem Cache */
  /* config.json ebenfalls Netz zuerst – sonst sehen installierte Apps veröffentlichte Preise nie */
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/config.json')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE).then(c => c.put(url.pathname.endsWith('/config.json') ? './config.json' : './index.html', copy));
        return res;
      }).catch(() => caches.match(url.pathname.endsWith('/config.json') ? './config.json' : './index.html'))
    );
    return;
  }
  /* Rest (Icons, Manifest): Cache zuerst, sonst Netz und nachcachen */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
