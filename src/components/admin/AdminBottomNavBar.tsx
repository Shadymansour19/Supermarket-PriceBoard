import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { BoxIcon, CategoriesIcon, ChartIcon } from "../Icons";

/** Mobile-only bottom tab bar for the admin area — same dark-green bar and
 * white/light-green text treatment as the public site's BottomNavBar, so
 * it reads as the same app, just with admin's own three destinations
 * instead of a customer's (no cart, no notch/raised button here — there's
 * no obvious admin equivalent of "cart" to give that prominence to).
 * Desktop/tablet keep the top-bar nav links instead (hidden here via
 * `md:hidden`, same split as the public layout). */
export function AdminBottomNavBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const productsActive = pathname === "/admin/products";
  const categoriesActive = pathname === "/admin/categories";
  const financeActive = pathname === "/admin/finance";

  const linkClass = (active: boolean) =>
    `font-label flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
      active ? "text-white" : "text-emerald-200/70"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex bg-[#0f3d2e] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link to="/admin/products" aria-current={productsActive} className={linkClass(productsActive)}>
        <BoxIcon className="h-6 w-6" />
        {t("admin.products")}
      </Link>
      <Link to="/admin/categories" aria-current={categoriesActive} className={linkClass(categoriesActive)}>
        <CategoriesIcon className="h-6 w-6" />
        {t("admin.categories")}
      </Link>
      <Link to="/admin/finance" aria-current={financeActive} className={linkClass(financeActive)}>
        <ChartIcon className="h-6 w-6" />
        {t("finance.title")}
      </Link>
    </nav>
  );
}
