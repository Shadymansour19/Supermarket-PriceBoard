import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { BellIcon, CartIcon, CategoriesIcon, HeartIcon, HomeIcon } from "./Icons";
import { useCart } from "../context/CartContext";
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
  const { itemCount } = useCart();
  const homeActive = pathname === "/";
  const categoriesActive = pathname === "/categories" || pathname.startsWith("/category/");
  const favoritesActive = pathname === "/favorites";
  const notificationsActive = pathname === "/notifications";
  const cartActive = pathname === "/cart";

  const linkClass = (active: boolean) =>
    `font-label relative flex flex-col items-center gap-0.5 py-2 text-xs ${
      active ? "text-white" : "text-emerald-200/70"
    }`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      {/* Five columns, not four — the middle one is deliberately empty, so
       * Categories/Favorites sit further out from center instead of
       * crowding right up against the cart button/notch between them. A
       * solid dark-green bar (the same brand color as the hero banner and
       * the PWA's theme-color) instead of near-white, so it reads clearly
       * as its own distinct element rather than blending into the page.
       *
       * The notch is a real hole, not a painted shape: a mask on the bar
       * itself, punching out a soft-edged circle (the cart button's own
       * shape, inverted) around where the button sits — genuinely
       * transparent there instead of a solid color standing in for one. */}
      <nav
        className="relative grid grid-cols-5 bg-[#0f3d2e]"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          maskImage: "radial-gradient(circle at 50% -8px, transparent 38px, black 48px)",
          WebkitMaskImage: "radial-gradient(circle at 50% -8px, transparent 38px, black 48px)",
        }}
      >
        <Link to="/" aria-current={homeActive} className={linkClass(homeActive)}>
          <HomeIcon className="h-6 w-6" />
          {t("nav.home")}
        </Link>
        <Link to="/categories" aria-current={categoriesActive} className={linkClass(categoriesActive)}>
          <CategoriesIcon className="h-6 w-6" />
          {t("nav.categories")}
        </Link>
        <span aria-hidden="true" />
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
        <Link to="/notifications" aria-current={notificationsActive} className={linkClass(notificationsActive)}>
          <BellIcon className="h-6 w-6" />
          {t("notifications.navLabel")}
        </Link>
      </nav>

      {/* The button sits inside that notch, raised well above the bar
       * (most of it above, only its lower edge nestling into the cut) for
       * a bigger, more prominent "primary action" presence. */}
      <Link
        to="/cart"
        aria-current={cartActive}
        aria-label={t("cart.navLabel")}
        data-cart-target
        className="absolute inset-x-0 top-0 z-10 mx-auto flex h-16 w-16 -translate-y-[62%] items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition hover:bg-emerald-700"
      >
        <CartIcon className="h-7 w-7" />
        {itemCount > 0 && (
          <span className="font-label absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {itemCount}
          </span>
        )}
      </Link>
    </div>
  );
}
