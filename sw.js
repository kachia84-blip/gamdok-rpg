importScripts('./fonts/files.js');
const CACHE_NAME = 'gamdok-v12';
const OPTIONAL_FILES = ['./data/monsters.json', './data/story.json'];
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg', './package.json', './sw.js',
  './core/rng.js', './core/cardgen.js', './core/hero.js', './core/battle.js', './core/dungeon.js', './core/shop.js', './core/save.js', './core/reveal.js',
  './ui/dom.js', './ui/content.js', './ui/app.js', './ui/battle-text.js',
  './ui/screens/common.js', './ui/screens/town.js', './ui/screens/dungeon.js', './ui/screens/battle.js',
  './ui/screens/levelup.js', './ui/screens/shop.js', './ui/screens/inn.js', './ui/screens/senior.js',
  './ui/screens/skillbook.js', './ui/screens/status.js', './ui/screens/story.js', './ui/screens/article.js',
  './data/cards.json', './data/articles.json', ...OPTIONAL_FILES,
  './fonts/files.js', ...self.FONT_FILES,
];

self.addEventListener('install', event => {
  // 서버에서 다시 받습니다. 집필 중인 이야기 파일이 없어도 기본 이야기로 실행합니다.
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await cache.addAll(FILES.filter(file => !OPTIONAL_FILES.includes(file)).map(file => new Request(file, { cache: 'reload' })));
    await Promise.allSettled(OPTIONAL_FILES.map(file => cache.add(new Request(file, { cache: 'reload' }))));
  }).then(() => self.skipWaiting()));
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
    try {
      const response = await fetch(event.request);
      if (response.ok && OPTIONAL_FILES.some(file => new URL(file, self.registration.scope).pathname === url.pathname)) {
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (event.request.mode === 'navigate') {
        const home = await cache.match('./index.html');
        if (home) return home;
      }
      return new Response('연결을 확인하신 뒤 다시 시도해 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }));
});
