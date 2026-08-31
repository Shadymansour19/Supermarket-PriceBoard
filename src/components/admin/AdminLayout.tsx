import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LanguageToggle } from "../LanguageToggle";
import { signOutAdmin } from "../../lib/auth";

export function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      isActive ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-bold text-emerald-700">{t("app.name")} · Admin</span>
          <nav className="flex items-center gap-2">
            <NavLink to="/admin/products" className={linkClass}>
              {t("admin.products")}
            </NavLink>
            <NavLink to="/admin/categories" className={linkClass}>
              {t("admin.categories")}
            </NavLink>
            <LanguageToggle />
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {t("admin.signOut")}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
