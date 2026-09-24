import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CloseIcon } from "../../components/ContactIcons";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { clearNotificationLog, getNotificationLog, type NotificationLogEntry } from "../../lib/notificationLog";

/** See NotificationToggle's isIOS comment — same reasoning, duplicated here
 * since that component no longer exists (its toggle moved into this page). */
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { supported, subscribed, loading, blocked, error, subscribe, unsubscribe } = usePushNotifications();
  const [showBlockedHint, setShowBlockedHint] = useState(false);
  const [showErrorHint, setShowErrorHint] = useState(false);
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  function loadLog() {
    getNotificationLog()
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLogLoading(false));
  }

  useEffect(() => {
    loadLog();
    // Live-refreshes the history while this page is open, so a new deal
    // notification shows up here right away without a manual reload.
    function handleMessage(event: MessageEvent) {
      if ((event.data as { type?: string } | undefined)?.type === "push-received") loadLog();
    }
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, []);

  // Surfaces the hook's background re-registration failure (see
  // usePushNotifications' mount effect) even though nothing was clicked —
  // otherwise the page would keep showing "enabled" with no indication
  // that the server-side row still doesn't exist.
  useEffect(() => {
    if (error) setShowErrorHint(true);
  }, [error]);

  async function handleToggleClick() {
    setShowErrorHint(false);
    try {
      if (subscribed) {
        await unsubscribe();
      } else if (blocked) {
        setShowBlockedHint(true);
      } else {
        const result = await subscribe();
        if (result === "denied") setShowBlockedHint(true);
      }
    } catch {
      setShowErrorHint(true);
    }
  }

  async function handleClearHistory() {
    if (!confirm(t("notifications.confirmClearHistory"))) return;
    await clearNotificationLog();
    setLog([]);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("notifications.navLabel")}</h1>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        {!supported ? (
          <p className="text-sm text-neutral-500">{t("notifications.notSupported")}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-700">
                {t(subscribed ? "notifications.statusEnabled" : "notifications.statusDisabled")}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleToggleClick}
                aria-pressed={subscribed}
                className={`font-label shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  subscribed
                    ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {t(subscribed ? "notifications.disable" : "notifications.enable")}
              </button>
            </div>

            {showBlockedHint && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-neutral-700">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-neutral-900">{t("notifications.blockedTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setShowBlockedHint(false)}
                    aria-label={t("common.close")}
                    className="shrink-0 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-neutral-600">
                  {t(isIOS() ? "notifications.blockedBodyIos" : "notifications.blockedBody")}
                </p>
              </div>
            )}

            {showErrorHint && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-neutral-700">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-neutral-900">{t("notifications.errorTitle")}</p>
                  <button
                    type="button"
                    onClick={() => setShowErrorHint(false)}
                    aria-label={t("common.close")}
                    className="shrink-0 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-neutral-600">{t("notifications.errorBody")}</p>
                {error && (
                  <p className="mt-2 break-words rounded bg-white p-1.5 text-xs text-neutral-500" dir="ltr">
                    {error}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-neutral-900">{t("notifications.historyTitle")}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{t("notifications.historyHint")}</p>
          </div>
          {log.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              {t("notifications.clearHistory")}
            </button>
          )}
        </div>

        {logLoading ? (
          <p className="text-sm text-neutral-500">{t("common.loading")}</p>
        ) : log.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            {t("notifications.historyEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {log.map((entry) => (
              <li key={entry.id}>
                <Link to={entry.url} className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50">
                  <img src="/pwa/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-medium text-neutral-900">{entry.title}</p>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {new Date(entry.receivedAt).toLocaleString(i18n.language === "ar" ? "ar" : "en")}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{entry.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
