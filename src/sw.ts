/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

// injectManifest strategy: vite-plugin-pwa/workbox-build replaces this at
// build time with the list of built assets to precache.
declare const self: ServiceWorkerGlobalScope;
precacheAndRoute(self.__WB_MANIFEST);

// registerType: 'autoUpdate' (vite.config.ts) relies on the page posting
// this message to a waiting worker — generateSW injects this listener
// automatically, but injectManifest doesn't, so a hand-authored sw.ts has
// to add it itself or updates never activate until every tab/window for
// the site is fully closed and reopened.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

type DealPushPayload = {
  title: string;
  body: string;
  /** Path to open on click, e.g. "/deals" or "/product/<id>". */
  url: string;
};

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json() as DealPushPayload;

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/deals";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).pathname === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
