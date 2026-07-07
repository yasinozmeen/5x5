// 5x5 Makro — basit offline service worker
const CACHE = "5x5-v2";
const APP_SHELL = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Web Push ──────────────────────────────────────────────────
// Sunucu dinlenme süresi dolunca push gönderir; burada bildirim gösterilir.
// iOS PWA'da özel ses yoktur — sistemin bildirim sesi + titreşim çalar.
self.addEventListener("push", (event) => {
  let data = { title: "Dinlenme bitti", body: "Sıradaki set için hazırsın." };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    /* düz metin değilse varsayılanı kullan */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || "rest-timer",
      renotify: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [400, 150, 400, 150, 400],
    })
  );
});

// Bildirime dokununca uygulamayı öne getir (açıksa) ya da aç.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // API isteklerini her zaman ağdan al (veri taze kalsın), offline'da hata döner
  if (url.pathname.startsWith("/api/")) return;

  // Network-first: taze içeriği tercih et, ağ yoksa cache'e düş
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
  );
});
