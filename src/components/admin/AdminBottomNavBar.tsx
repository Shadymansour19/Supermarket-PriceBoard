import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { BoxIcon, CategoriesIcon } from "../Icons";

/** Mobile-only bottom tab bar for the admin area — mirrors the public
 * site's BottomNavBar. Desktop/tablet keep the top-bar nav links instead
 * (hidden here via `md:hidden`, same split as the public layout). */
export function AdminBottomNavBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const productsActive = pathname === "/admin/products";
  const categoriesActive = pathname === "/admin/categories";

  const linkClass = (active: boolean) =>
    `font-label flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
      active ? "text-emerald-700" : "text-neutral-500"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white md:hidden"
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
    </nav>
  );
}
