import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { CategoriesIcon, HeartIcon, HomeIcon } from "./Icons";
import { useFavorites } from "../context/FavoritesContext";

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
  const { favoriteIds } = useFavorites();
  const homeActive = pathname === "/";
  const categoriesActive = pathname === "/categories" || pathname.startsWith("/category/");
  const favoritesActive = pathname === "/favorites";

  const linkClass = (active: boolean) =>
    `font-label relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
      active ? "text-emerald-700" : "text-neutral-500"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link to="/" aria-current={homeActive} className={linkClass(homeActive)}>
        <HomeIcon className="h-6 w-6" />
        {t("nav.home")}
      </Link>
      <Link to="/categories" aria-current={categoriesActive} className={linkClass(categoriesActive)}>
        <CategoriesIcon className="h-6 w-6" />
        {t("nav.categories")}
      </Link>
      <Link to="/favorites" aria-current={favoritesActive} className={linkClass(favoritesActive)}>
        <span className="relative">
          <HeartIcon className="h-6 w-6" filled={favoritesActive || favoriteIds.size > 0} />
          {favoriteIds.size > 0 && (
            <span className="absolute -end-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-600 px-0.5 text-[9px] font-semibold text-white">
              {favoriteIds.size}
            </span>
          )}
        </span>
        {t("favorites.navLabel")}
      </Link>
    </nav>
  );
}
