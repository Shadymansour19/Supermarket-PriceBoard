import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { CategoriesIcon, HomeIcon } from "./Icons";

/**
 * Mobile-only bottom tab bar (hidden at `md`+, where the persistent
 * sidebar in CatalogPage already covers category navigation). "Categories"
 * counts as active for both `/categories` (the browse-by-category page)
 * and `/category/:id` (a specific category's products), not just an exact
 * path match.
 */
export function BottomNavBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const homeActive = pathname === "/";
  const categoriesActive = pathname === "/categories" || pathname.startsWith("/category/");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        to="/"
        aria-current={homeActive}
        className={`font-label flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
          homeActive ? "text-emerald-700" : "text-neutral-500"
        }`}
      >
        <HomeIcon className="h-6 w-6" />
        {t("nav.home")}
      </Link>
      <Link
        to="/categories"
        aria-current={categoriesActive}
        className={`font-label flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
          categoriesActive ? "text-emerald-700" : "text-neutral-500"
        }`}
      >
        <CategoriesIcon className="h-6 w-6" />
        {t("nav.categories")}
      </Link>
    </nav>
  );
}
