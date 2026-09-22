import { useTranslation } from "react-i18next";
import { BellIcon } from "./Icons";
import { usePushNotifications } from "../hooks/usePushNotifications";

/** Header bell toggle for "new deal" push notifications — hidden entirely
 * when the browser doesn't support the Push API (e.g. iOS Safari below
 * 16.4) rather than showing a button that can't do anything. */
export function NotificationToggle() {
  const { t } = useTranslation();
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => (subscribed ? unsubscribe() : subscribe())}
      aria-pressed={subscribed}
      aria-label={t(subscribed ? "notifications.disable" : "notifications.enable")}
      title={t(subscribed ? "notifications.disable" : "notifications.enable")}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50 ${
        subscribed ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      <BellIcon slashed={!subscribed} className="h-5 w-5" />
    </button>
  );
}
