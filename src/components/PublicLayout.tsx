import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { LanguageToggle } from "./LanguageToggle";

export function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-xl font-bold text-emerald-700">
            {t("app.name")}
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
