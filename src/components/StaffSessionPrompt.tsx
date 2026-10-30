import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathFor, listAccounts, switchTo, type AccountSummary } from "../lib/accounts";

const DISMISSED_KEY = "hamada_staff_prompt_dismissed";

/**
 * Asks a staff member (admin or cashier) who lands on the customer-facing
 * site whether they meant to go to their own work area instead — easy to
 * do by accident (an old tab, a bookmark, the install icon) while still
 * signed in on this device. Same dialog for both roles; only the wording
 * and destination differ. When several staff accounts are signed in on
 * this device (e.g. an admin and a cashier), it offers a destination for
 * each — switching to that account first when it isn't the active one.
 * Only
 * once per browser session (sessionStorage, not localStorage): re-asking
 * on every single page within the same visit would be more annoying than
 * useful, but a fresh visit later should ask again rather than silently
 * remembering a choice made days ago.
 */
export function StaffSessionPrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role, session, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !role) return;
    let alreadyDismissed = false;
    try {
      alreadyDismissed = sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      // Private-browsing storage can throw — fall back to asking, same as
      // if nothing had been dismissed yet.
    }
    if (alreadyDismissed) return;
    // Read when the dialog opens; the active account (just remembered by
    // AuthContext) goes first.
    const activeId = session?.user.id;
    setAccounts(listAccounts().sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId)));
    setVisible(true);
  }, [loading, role, session]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Best-effort — worst case it asks again on the next page this
      // session, which is a minor annoyance, not a bug.
    }
  }

  async function goTo(account: AccountSummary) {
    setError(null);
    if (account.id !== session?.user.id) {
      const result = await switchTo(account.id);
      if (!result.ok) {
        // The dead account was forgotten; the current one stays active.
        setAccounts(listAccounts());
        setError(t("accounts.expired"));
        return;
      }
    }
    dismiss();
    navigate(homePathFor(account.role));
  }

  if (!visible || !role) return null;

  const several = accounts.length > 1;
  const isCashier = role === "cashier";
  const title = t(several ? "accounts.promptTitle" : isCashier ? "cashier.sessionPromptTitle" : "admin.sessionPromptTitle");
  const body = t(several ? "accounts.promptBody" : isCashier ? "cashier.sessionPromptBody" : "admin.sessionPromptBody");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={dismiss}
    >
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-base font-bold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-600">{body}</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          {(several ? accounts : [{ id: session?.user.id ?? "", role, display_name: null, email: null }]).map((account, index) => (
            <button
              key={account.id}
              type="button"
              onClick={() => goTo(account)}
              className={`font-label w-full rounded-lg px-4 py-2 text-sm font-semibold ${
                index === 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {t(account.role === "cashier" ? "cashier.goToDesk" : "admin.goToAdmin")}
              {several && (
                <span className="block truncate text-xs font-normal opacity-80">
                  {account.display_name ?? account.email}
                </span>
              )}
            </button>
          ))}
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
