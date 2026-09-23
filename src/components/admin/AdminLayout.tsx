import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { AdminBottomNavBar } from "./AdminBottomNavBar";
import { AdminMenu } from "./AdminMenu";
import { LanguageToggle } from "../LanguageToggle";

export function AdminLayout() {
  const { t } = useTranslation();

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
            {/* Products/Categories move to the bottom tab bar on mobile —
             * these stay for desktop/tablet only, same split as the
             * public site's nav. */}
            <NavLink
              to="/admin/products"
              className={({ isActive }) => `hidden md:block ${linkClass({ isActive })}`}
            >
              {t("admin.products")}
            </NavLink>
            <NavLink
              to="/admin/categories"
              className={({ isActive }) => `hidden md:block ${linkClass({ isActive })}`}
            >
              {t("admin.categories")}
            </NavLink>
            <LanguageToggle />
            <AdminMenu />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      <AdminBottomNavBar />
    </div>
  );
}
