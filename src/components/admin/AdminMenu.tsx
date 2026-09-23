import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MenuIcon } from "../Icons";
import { signOutAdmin } from "../../lib/auth";

/** Groups the two admin actions that aren't day-to-day navigation — "view
 * the public site" and "sign out" — behind one menu button, instead of
 * both sitting as separate always-visible top-bar buttons. */
export function AdminMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
          <div className="font-label absolute top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg end-0">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.viewSite")}
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-start text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.signOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
