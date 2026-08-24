/* ATLAS service worker: user-scoped page caching and durable sync. */
const VERSION = "atlas-pwa-v2";
const CORE_CACHE = `${VERSION}-core`;
const ASSET_CACHE = `${VERSION}-assets`;
const PUBLIC_CACHE = `${VERSION}-public`;
const PRIVATE_CACHE_PREFIX = `${VERSION}-private-`;
const DATABASE_NAME = "project-atlas-offline";
const DATABASE_VERSION = 1;
const MUTATION_STORE = "mutations";
const META_STORE = "meta";
const CORE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/atlas-system-core-192.png",
  "/icons/atlas-system-core-512.png",
  "/icons/atlas-system-core-maskable-512.png",
];
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/offline.html",
]);

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(MUTATION_STORE)) {
        const store = database.createObjectStore(MUTATION_STORE, {
          keyPath: "id",
        });
        store.createIndex("userId", "userId", { unique: false });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
  });
}

async function databaseRequest(storeName, mode, run) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const completion = new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    const request = run(transaction.objectStore(storeName));
    const result = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await completion;
    return result;
  } finally {
    database.close();
  }
}

async function setActiveUser(userId) {
  if (userId) {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(
          (name) =>
            name.startsWith(PRIVATE_CACHE_PREFIX) &&
            name !== `${PRIVATE_CACHE_PREFIX}${userId}`,
        )
        .map((name) => caches.delete(name)),
    );
  }
  await databaseRequest(META_STORE, "readwrite", (store) =>
    store.put({ key: "activeUserId", value: userId || null }),
  );
}

async function getActiveUser() {
  const entry = await databaseRequest(META_STORE, "readonly", (store) =>
    store.get("activeUserId"),
  );
  return entry?.value || null;
}

async function userMutations(userId) {
  return databaseRequest(MUTATION_STORE, "readonly", (store) =>
    store.index("userId").getAll(userId),
  );
}

async function deleteMutation(id) {
  await databaseRequest(MUTATION_STORE, "readwrite", (store) =>
    store.delete(id),
  );
}

async function updateMutation(mutation) {
  await databaseRequest(MUTATION_STORE, "readwrite", (store) =>
    store.put(mutation),
  );
}

async function broadcast(message) {
  const windows = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  windows.forEach((client) => client.postMessage(message));
}

async function syncPendingMutations() {
  const userId = await getActiveUser();
  if (!userId) return;
  const queued = (await userMutations(userId)).filter(
    (mutation) => !mutation.blocked,
  );
  if (!queued.length) return;

  let synced = 0;
  let failed = 0;
  const messages = [];
  for (let index = 0; index < queued.length; index += 25) {
    const batch = queued.slice(index, index + 25);
    let response;
    try {
      response = await fetch("/api/offline-sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutations: batch }),
      });
    } catch {
      break;
    }
    if (response.status === 401) {
      await broadcast({ type: "SYNC_AUTH_REQUIRED" });
      break;
    }
    if (!response.ok) break;

    const body = await response.json();
    for (const result of body.results || []) {
      const mutation = batch.find((item) => item.id === result.id);
      if (!mutation) continue;
      if (result.success) {
        await deleteMutation(mutation.id);
        synced += 1;
      } else {
        await updateMutation({
          ...mutation,
          attempts: (mutation.attempts || 0) + 1,
          blocked: result.retryable === false,
          lastError: result.message,
        });
        if (result.retryable === false) {
          failed += 1;
          messages.push(result.message);
        }
      }
    }
  }

  await broadcast({ type: "SYNC_COMPLETE", synced, failed, messages });
}

function normalizedPageKey(request) {
  const url = new URL(request.url);
  const rsc =
    request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  url.searchParams.delete("_rsc");
  if (rsc) url.searchParams.set("__atlas_rsc", "1");
  url.hash = "";
  return new Request(url.toString(), { method: "GET" });
}

async function pageCacheName(url) {
  if (PUBLIC_PATHS.has(url.pathname)) return PUBLIC_CACHE;
  const userId = await getActiveUser();
  return userId ? `${PRIVATE_CACHE_PREFIX}${userId}` : null;
}

async function cachePage(request, response) {
  if (
    !response ||
    response.status !== 200 ||
    response.type === "opaque" ||
    response.redirected ||
    response.headers.has("x-nextjs-redirect")
  )
    return;
  const url = new URL(request.url);
  if (new URL(response.url).pathname !== url.pathname) return;
  const cacheName = await pageCacheName(url);
  if (!cacheName) return;
  const cache = await caches.open(cacheName);
  await cache.put(normalizedPageKey(request), response.clone());
}

async function networkFirstPage(request) {
  const key = normalizedPageKey(request);
  const cacheName = await pageCacheName(new URL(request.url));
  const cache = cacheName ? await caches.open(cacheName) : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    await cachePage(request, response);
    return response;
  } catch {
    clearTimeout(timeout);
    const cached = await cache?.match(key, { ignoreVary: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match("/offline.html")) || Response.error();
    }
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function cacheUrl(url) {
  const request = new Request(url, { credentials: "include" });
  const response = await fetch(request);
  await cachePage(request, response);
}

async function clearPrivateData() {
  const userId = await getActiveUser();
  if (userId) await caches.delete(`${PRIVATE_CACHE_PREFIX}${userId}`);
  await setActiveUser(null);
}

async function clearPrivateCache() {
  const userId = await getActiveUser();
  if (userId) await caches.delete(`${PRIVATE_CACHE_PREFIX}${userId}`);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(async (cache) => {
      await Promise.all(
        CORE_URLS.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter(
                (name) =>
                  name.startsWith("atlas-pwa-") && !name.startsWith(VERSION),
              )
              .map((name) => caches.delete(name)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"))
    return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image/") ||
    /\.(?:css|js|woff2?|png|svg|jpg|jpeg|gif|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (
    request.mode === "navigate" ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc")
  ) {
    event.respondWith(networkFirstPage(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "atlas-offline-sync")
    event.waitUntil(syncPendingMutations());
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "ATLAS",
    body: "You have an ATLAS reminder.",
    url: "/dashboard",
  };
  let payload = fallback;
  try {
    payload = { ...fallback, ...(event.data?.json() || {}) };
  } catch {
    payload = fallback;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/atlas-system-core-192.png",
      badge: "/icons/atlas-system-core-192.png",
      tag: "atlas-daily-digest",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find(
          (windowClient) => windowClient.url === destination,
        );
        if (existing) return existing.focus();
        return clients.openWindow(destination);
      }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SET_USER") {
    event.waitUntil(
      setActiveUser(data.userId).then(async () => {
        if (typeof data.url === "string") {
          await cacheUrl(data.url).catch(() => undefined);
        }
        await syncPendingMutations();
      }),
    );
  } else if (data.type === "CACHE_URL" && typeof data.url === "string") {
    event.waitUntil(cacheUrl(data.url).catch(() => undefined));
  } else if (data.type === "SYNC_NOW") {
    event.waitUntil(syncPendingMutations());
  } else if (data.type === "CLEAR_PRIVATE_DATA") {
    event.waitUntil(clearPrivateData());
  } else if (data.type === "CLEAR_PRIVATE_CACHE") {
    event.waitUntil(
      clearPrivateCache().then(() =>
        event.ports[0]?.postMessage({ type: "PRIVATE_CACHE_CLEARED" }),
      ),
    );
  }
});
