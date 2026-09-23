import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "./ContactIcons";
import { BellIcon } from "./Icons";
import { usePushNotifications } from "../hooks/usePushNotifications";

/** No web page can deep-link into a browser's own site-settings UI —
 * browsers block that on purpose, so nothing here can be a real "open
 * settings" button. The best available fallback is telling people exactly
 * where to look, which differs enough by platform to be worth detecting:
 * on iOS, an installed PWA's notification permission lives in the iOS
 * Settings app, not inside the browser at all. */
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** Header bell toggle for "new deal" push notifications — hidden entirely
 * when the browser doesn't support the Push API (e.g. iOS Safari below
 * 16.4) rather than showing a button that can't do anything. */
export function NotificationToggle() {
  const { t } = useTranslation();
  const { supported, subscribed, loading, blocked, error, subscribe, unsubscribe } = usePushNotifications();
  const [showBlockedHint, setShowBlockedHint] = useState(false);
  const [showErrorHint, setShowErrorHint] = useState(false);

  if (!supported) return null;

  // Once the browser's permission prompt gets an explicit "block", it
  // never shows again — surface that immediately (either right after this
  // click causes it, or on a later click while already blocked) instead
  // of the button silently doing nothing. Deliberately not shown just
  // because `blocked` happens to already be true on mount (e.g. denied on
  // a previous visit) — popping this up unprompted on every page load
  // would be exactly the repeated-nagging browsers block re-prompting to
  // prevent.
  async function handleClick() {
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
      // subscribe()/unsubscribe() already recorded the message in `error`
      // — surface it instead of failing invisibly, which is what happened
      // before this had any error handling at all.
      setShowErrorHint(true);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={handleClick}
        aria-pressed={subscribed}
        aria-label={t(subscribed ? "notifications.disable" : "notifications.enable")}
        title={t(subscribed ? "notifications.disable" : "notifications.enable")}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50 ${
          subscribed ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        <BellIcon slashed={!subscribed} className="h-5 w-5" />
      </button>

      {showBlockedHint && (
        <div className="font-label absolute top-full z-40 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-lg end-0">
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
        <div className="font-label absolute top-full z-40 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 shadow-lg end-0">
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
          {error && <p className="mt-2 break-words rounded bg-neutral-50 p-1.5 text-xs text-neutral-500" dir="ltr">{error}</p>}
        </div>
      )}
    </div>
  );
}
