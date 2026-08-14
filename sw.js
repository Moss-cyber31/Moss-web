// MOSS 工作台 · 离线缓存（仅缓存应用外壳，数据走 GitHub API，不缓存）
const CACHE = 'moss-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 跨域请求（如 api.github.com 同步）不拦截，始终走网络
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // 导航：网络优先，保证总能拿到最新页面；离线时回退缓存
    event.respondWith(
      fetch(req).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./moss-workbench.html')))
    );
  } else {
    // 静态资源：缓存优先
    event.respondWith(
      caches.match(req).then(r =>
        r || fetch(req).then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
          return res;
        })
      )
    );
  }
});
