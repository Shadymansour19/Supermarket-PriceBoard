import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { CheckIcon, MenuIcon } from "../Icons";
import { CloseIcon } from "../ContactIcons";
import { useAuth } from "../../context/AuthContext";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { homePathFor, listAccounts, removeAccount, signOutAll, signOutCurrent, switchTo } from "../../lib/accounts";
import { AddAccountDialog } from "./AddAccountDialog";

/** The staff menu: the accounts signed in on this device (tap one to
 * switch, ✕ to forget it, add another), plus "view the public site",
 * "cashier desk" / "cashiers" (admin only) and sign out. Replaces separate
 * always-visible top-bar buttons for these non-day-to-day actions. */
export function AdminMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirmDialog = useConfirmDialog();
  const { isAdmin, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Re-read on every render: the list lives in localStorage, and `session`
  // (a dependency of this component through useAuth) changes whenever it does.
  const accounts = listAccounts();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSwitch(id: string) {
    setNotice(null);
    const result = await switchTo(id);
    if (!result.ok) {
      // The failed account was forgotten and the previous one stays active.
      setNotice(t("accounts.expired"));
      return;
    }
    setOpen(false);
    navigate(homePathFor(result.role), { replace: true });
  }

  async function handleRemove(id: string, name: string) {
    // Our own dialog, never the browser's: removing an account is easy to
    // hit by accident and means typing its password again.
    if (!(await confirmDialog({ message: t("accounts.confirmRemove", { name }), destructive: true }))) return;
    await removeAccount(id);
    setNotice(null);
    // Nothing else re-renders on a localStorage change; reopen to refresh.
    setOpen(false);
    setTimeout(() => setOpen(true), 0);
  }

  async function handleSignOut() {
    setOpen(false);
    const role = await signOutCurrent();
    navigate(role ? homePathFor(role) : "/admin/login", { replace: true });
  }

  async function handleSignOutAll() {
    setOpen(false);
    await signOutAll();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setNotice(null);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label={t("admin.menu")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          {/* Closes the menu on an outside click without needing a
           * separate document-level listener. */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="font-label absolute top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg end-0">
            <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase text-neutral-400">{t("accounts.here")}</p>
            <ul>
              {accounts.map((account) => {
                const active = account.id === session?.user.id;
                const name = account.display_name ?? account.email ?? "—";
                return (
                  <li key={account.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleSwitch(account.id)}
                      aria-current={active}
                      className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-start text-sm hover:bg-neutral-100"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-neutral-900">{name}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {t(account.role === "admin" ? "accounts.roleAdmin" : "accounts.roleCashier")}
                          {account.display_name && account.email ? ` · ${account.email}` : ""}
                        </span>
                      </span>
                      {active && <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />}
                    </button>
                    {!active && (
                      <button
                        type="button"
                        onClick={() => handleRemove(account.id, name)}
                        title={t("accounts.remove")}
                        aria-label={`${t("accounts.remove")}: ${name}`}
                        className="me-2 shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {notice && <p className="px-4 py-1 text-xs text-red-600">{notice}</p>}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAdding(true);
              }}
              className="block w-full px-4 py-2 text-start text-sm text-emerald-700 hover:bg-neutral-100"
            >
              + {t("accounts.add")}
            </button>
            <div className="my-1 border-t border-neutral-100" />
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.viewSite")}
            </a>
            {isAdmin && (
              <Link
                to="/admin/staff"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                {t("staff.title")}
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/cashier"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                {t("cashier.desk")}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-start text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.signOut")}
            </button>
            {accounts.length > 1 && (
              <button
                type="button"
                onClick={handleSignOutAll}
                className="block w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-neutral-100"
              >
                {t("accounts.signOutAll")}
              </button>
            )}
          </div>
        </>
      )}

      {adding && (
        <AddAccountDialog
          onClose={() => setAdding(false)}
          onDone={(result) => {
            setAdding(false);
            navigate(homePathFor(result.role), { replace: true });
          }}
        />
      )}
    </div>
  );
}
