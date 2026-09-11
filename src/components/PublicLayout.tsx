import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { LanguageToggle } from "./LanguageToggle";

export function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-700">
            <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover" />
            {t("app.name")}
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="text-sm font-medium text-neutral-700 hover:text-emerald-700">
              {t("nav.contact")}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
