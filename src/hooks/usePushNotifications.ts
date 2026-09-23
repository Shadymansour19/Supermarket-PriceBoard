import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { registerPushSubscription, unregisterPushSubscription } from "../lib/pushSubscriptions";

/** `PushManager.subscribe` needs the VAPID public key as a raw Uint8Array,
 * not the base64url string it's normally shared as. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

/** Drives the header bell toggle: subscribes/unsubscribes this device for
 * "new deal" push notifications, mirroring the usePwaInstall hook's shape
 * (small, single-purpose, feature-detects and no-ops where unsupported). */
export function usePushNotifications() {
  const { i18n } = useTranslation();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  // Once a user explicitly denies the permission prompt, browsers never
  // show it again for this site — Notification.requestPermission() just
  // silently re-resolves "denied" forever after. Tracking this lets the
  // UI say so instead of the button looking like it does nothing.
  const [blocked, setBlocked] = useState(() => isSupported() && Notification.permission === "denied");

  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => setSubscribed(existing !== null))
      .catch(() => setSubscribed(false));
  }, []);

  // Returns the resulting permission so the caller can react to a fresh
  // "denied" right away (e.g. show a hint) — distinct from `blocked`,
  // which also reflects a denial from a previous visit and shouldn't by
  // itself pop up any UI on mount (that'd be exactly the repeated-nagging
  // browsers block re-prompting to prevent).
  const subscribe = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported()) return "default";
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setBlocked(permission === "denied");
      if (permission !== "granted") return permission;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      await registerPushSubscription(subscription, i18n.language);
      setSubscribed(true);
      return permission;
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported()) return;
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unregisterPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported: isSupported(), subscribed, loading, blocked, subscribe, unsubscribe };
}
