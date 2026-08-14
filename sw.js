// MOSS 工作台 · 离线缓存
// 策略：所有同源 GET 一律「网络优先」，保证设备总能拿到最新页面/脚本；
// 仅在断网时回退到缓存，从而实现离线可用。跨域（api.github.com 同步）不拦截，始终走网络。
const CACHE = 'moss-v13';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './sw.js'];

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

  // 同源：网络优先，拿到最新；失败再回退缓存
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
