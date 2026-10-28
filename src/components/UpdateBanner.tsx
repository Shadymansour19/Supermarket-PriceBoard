import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "./ContactIcons";
import { RefreshIcon } from "./Icons";
import { applyUpdate, dismissUpdate, getNeedsRefresh, subscribeNeedsRefresh } from "../lib/appUpdate";

/**
 * Sticky top bar telling the admin/customer a new deploy is ready, instead
 * of the old silent-reload-mid-session behavior (jarring if it happens
 * while someone's filling in a form). Mounted once at the app root so it
 * shows regardless of which area (public or admin) is open. `useSyncExternalStore`
 * is enough for one boolean fed from outside React (main.tsx's service-worker
 * registration) — no state library needed for that.
 */
export function UpdateBanner() {
  const { t } = useTranslation();
  const needsRefresh = useSyncExternalStore(subscribeNeedsRefresh, getNeedsRefresh, () => false);
  const [refreshing, setRefreshing] = useState(false);

  if (!needsRefresh) return null;

  function handleRefresh() {
    setRefreshing(true);
    applyUpdate();
  }

  return (
    <div
      role="alert"
      className="font-label animate-update-banner-in sticky top-0 z-[60] flex items-center justify-center gap-3 bg-[#0f3d2e] px-4 py-3 text-white shadow-lg"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <RefreshIcon className="h-5 w-5 shrink-0" />
      <strong className="text-sm font-semibold">{t("update.available")}</strong>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        className="animate-pulse-glow shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#0b4f4a] disabled:opacity-70"
      >
        {refreshing ? t("update.refreshing") : t("update.refresh")}
      </button>
      {!refreshing && (
        <button
          type="button"
          onClick={dismissUpdate}
          aria-label={t("update.dismiss")}
          className="shrink-0 rounded-full p-1 text-white/85 hover:bg-white/10 hover:text-white"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
