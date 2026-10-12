import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DISMISSED_KEY = "hamada_admin_prompt_dismissed";

/**
 * Asks an admin who lands on the customer-facing site whether they meant
 * to go to the dashboard instead — easy to do by accident (an old tab, a
 * bookmark, the install icon) while still signed in on this device. Only
 * once per browser session (sessionStorage, not localStorage): re-asking
 * on every single page within the same visit would be more annoying than
 * useful, but a fresh visit later should ask again rather than silently
 * remembering a choice made days ago.
 */
export function AdminSessionPrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || !isAdmin) return;
    let alreadyDismissed = false;
    try {
      alreadyDismissed = sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      // Private-browsing storage can throw — fall back to asking, same as
      // if nothing had been dismissed yet.
    }
    if (!alreadyDismissed) setVisible(true);
  }, [loading, isAdmin]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Best-effort — worst case it asks again on the next page this
      // session, which is a minor annoyance, not a bug.
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("admin.sessionPromptTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={dismiss}
    >
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-base font-bold text-neutral-900">{t("admin.sessionPromptTitle")}</h2>
        <p className="text-sm text-neutral-600">{t("admin.sessionPromptBody")}</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              dismiss();
              navigate("/admin/products");
            }}
            className="font-label w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t("admin.goToAdmin")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="font-label w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            {t("admin.continueAsCustomer")}
          </button>
        </div>
      </div>
    </div>
  );
}
