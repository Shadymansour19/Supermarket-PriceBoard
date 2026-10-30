import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AdminMenu } from "../admin/AdminMenu";
import { CartIcon, DownloadBoxIcon, ReceiptIcon } from "../Icons";
import { DeveloperCredit } from "../DeveloperCredit";
import { LanguageToggle } from "../LanguageToggle";

const TABS = [
  { to: "/cashier/sell", label: "cashier.sell", Icon: CartIcon },
  { to: "/cashier/receive", label: "cashier.receive", Icon: DownloadBoxIcon },
  { to: "/cashier/invoices", label: "cashier.invoices", Icon: ReceiptIcon },
] as const;

/** Cashier work area: sell, receive stock, and invoice history. Same shell
 * as AdminLayout (top bar on desktop, dark-green bottom tabs on mobile). */
export function CashierLayout() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `hidden rounded-md px-3 py-1.5 text-sm font-medium md:block ${
      isActive ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-bold text-emerald-700">
            {t("app.name")} · {t("cashier.desk")}
          </span>
          <nav className="flex items-center gap-2">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} className={linkClass}>
                {t(tab.label)}
              </NavLink>
            ))}
            {isAdmin && (
              <Link to="/admin/products" className="hidden px-2 text-sm text-emerald-700 hover:underline md:block">
                {t("cashier.backToAdmin")}
              </Link>
            )}
            <LanguageToggle />
            <AdminMenu />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-20 md:pb-6">
        <Outlet />
        <DeveloperCredit />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex bg-[#0f3d2e] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active}
              className={`font-label flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                active ? "text-white" : "text-emerald-200/70"
              }`}
            >
              <Icon className="h-6 w-6" />
              {t(label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
