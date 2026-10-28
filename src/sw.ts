/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { logReceivedNotification } from "./lib/notificationLog";

// injectManifest strategy: vite-plugin-pwa/workbox-build replaces this at
// build time with the list of built assets to precache.
declare const self: ServiceWorkerGlobalScope;
precacheAndRoute(self.__WB_MANIFEST);

// registerType: 'prompt' (vite.config.ts) means a new worker should sit in
// "waiting" until the visible UpdateBanner's "Refresh" is clicked, instead
// of activating itself immediately — generateSW's own output listens for
// this message automatically, but injectManifest doesn't generate
// anything, so a hand-authored sw.ts has to add the listener itself.
// `updateSW(true)` (lib/appUpdate.ts, called from UpdateBanner) is what
// posts this message.
self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") self.skipWaiting();
});
clientsClaim();

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
    (async () => {
      // Logged before (and independent of) showNotification, so a push that
      // arrives but fails to display — a permission quirk, an OS
      // suppressing it, a bad payload — still shows up in the in-app
      // notification history instead of looking exactly like one that
      // never arrived at all.
      await logReceivedNotification({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        receivedAt: Date.now(),
      }).catch(() => {});

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => client.postMessage({ type: "push-received" }));

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/pwa/icon-192.png",
        badge: "/pwa/icon-192.png",
        data: { url: payload.url },
      });
    })(),
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
