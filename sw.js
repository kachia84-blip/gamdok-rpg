importScripts('./fonts/files.js');
const CACHE_NAME = 'gamdok-v3';
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg', './package.json', './sw.js',
  './core/score.js', './core/inspect.js', './core/judge.js', './core/review.js', './core/save.js',
  './core/fields.js', './core/items.js', './core/codex.js',
  './ui/dom.js', './ui/app.js',
  './ui/screens/home.js', './ui/screens/briefing.js', './ui/screens/scene.js',
  './ui/screens/cite.js', './ui/screens/rebut.js', './ui/screens/report.js',
  './ui/screens/review.js', './ui/screens/article.js',
  './ui/screens/codex.js',
  './data/sites.json', './data/articles.json',
  './data/sites/s01.json', './data/sites/s02.json', './data/sites/s03.json',
  './fonts/files.js', ...self.FONT_FILES,
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gamdok-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); } catch {
      if (event.request.mode === 'navigate') {
        const home = await cache.match('./index.html');
        if (home) return home;
      }
      return new Response('연결을 확인하신 뒤 다시 시도해 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }));
});
