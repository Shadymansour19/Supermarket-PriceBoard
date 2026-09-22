import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { CloseIcon } from "./ContactIcons";
import { DownloadIcon, ShareIcon } from "./InstallIcons";

const DISMISS_KEY = "pwaInstallBannerDismissed";

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private-browsing storage can throw — dismissing is a one-tab nicety,
    // not something worth failing over.
  }
}

/**
 * A slim, dismissible banner (shown on every public page, once per tab
 * session) that puts installing the app one tap away — most users never
 * find a browser's "Install app" menu item on their own. On Chromium it
 * triggers the browser's own install-confirm dialog directly; on iOS
 * Safari, which never offers that dialog, it opens on-screen steps for the
 * manual Share → Add to Home Screen flow instead.
 */
export function InstallBanner() {
  const { t } = useTranslation();
  const { installed, canPrompt, isIOS, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (installed || dismissed || !(canPrompt || isIOS)) return null;

  const dismiss = () => {
    persistDismissed();
    setDismissed(true);
  };

  const handleInstallClick = () => {
    if (canPrompt) {
      void promptInstall();
    } else {
      setShowIosSteps(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm">
        <img src="/logo.jpg" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-medium text-emerald-900">{t("install.title")}</p>
          <p className="truncate text-emerald-700">{t("install.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={handleInstallClick}
          className="font-label flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 font-medium text-white hover:bg-emerald-700"
        >
          <DownloadIcon className="h-4 w-4" />
          {t("install.install")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("install.notNow")}
          className="shrink-0 rounded-full p-1 text-emerald-700/70 hover:bg-emerald-100 hover:text-emerald-900"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {showIosSteps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("install.iosTitle")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowIosSteps(false)}
        >
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-neutral-900">{t("install.iosTitle")}</h2>
              <button
                type="button"
                onClick={() => setShowIosSteps(false)}
                aria-label={t("common.close")}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <ol className="space-y-3 text-neutral-700">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <ShareIcon className="h-4 w-4" />
                </span>
                {t("install.iosStep1")}
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                  2
                </span>
                {t("install.iosStep2")}
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                  3
                </span>
                {t("install.iosStep3")}
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosSteps(false)}
              className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700"
            >
              {t("install.gotIt")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
