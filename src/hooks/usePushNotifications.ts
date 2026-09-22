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

  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((existing) => setSubscribed(existing !== null))
      .catch(() => setSubscribed(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported()) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      await registerPushSubscription(subscription, i18n.language);
      setSubscribed(true);
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

  return { supported: isSupported(), subscribed, loading, subscribe, unsubscribe };
}
