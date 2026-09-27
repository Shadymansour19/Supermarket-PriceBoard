import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";
import { BottomNavBar } from "./BottomNavBar";
import { ContactWidget } from "./ContactWidget";
import { Footer } from "./Footer";
import { BellIcon, CartIcon, HeartIcon } from "./Icons";
import { InstallBanner } from "./InstallBanner";
import { LanguageToggle } from "./LanguageToggle";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

export function PublicLayout() {
  const { t } = useTranslation();
  const { favoriteIds } = useFavorites();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-heading flex items-center gap-2 text-xl font-bold text-emerald-700">
            <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-full object-cover" />
            {t("app.name")}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label={t("notifications.navLabel")}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 md:flex"
            >
              <BellIcon />
            </Link>
            <Link
              to="/favorites"
              aria-label={t("favorites.navLabel")}
              className="relative hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 md:flex"
            >
              <HeartIcon filled={favoriteIds.size > 0} />
              {favoriteIds.size > 0 && (
                <span className="font-label absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                  {favoriteIds.size}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              aria-label={t("cart.navLabel")}
              data-cart-target
              className="relative hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 md:flex"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="font-label absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>
      <InstallBanner />
      <main className="pb-mobile-fab-safe mx-auto max-w-6xl px-4 pt-6">
        <Outlet />
      </main>
      <Footer />
      {/* Clears the fixed mobile bottom nav bar and floating cart button
       * so neither ever covers the tail end of the footer. */}
      <div className="pb-mobile-fab-safe md:hidden" />
      <ContactWidget />
      <BottomNavBar />
    </div>
  );
}
