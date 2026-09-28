import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "../../components/ContactIcons";
import { CONTACT } from "../../config";
import { formatPrice } from "../../lib/localize";
import { clearOrderHistory, getOrderHistory, type OrderHistoryEntry } from "../../lib/orderHistory";

export function OrderHistoryPage() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    setOrders(getOrderHistory());
  }, []);

  function handleClear() {
    if (!confirm(t("orderHistory.confirmClearHistory"))) return;
    clearOrderHistory();
    setOrders([]);
  }

  function handleResend(order: OrderHistoryEntry) {
    const lines = order.items.map((item) =>
      t("cart.whatsappLine", {
        name: item.name,
        quantity: item.quantity,
        subtotal: formatPrice(item.subtotal, i18n.language),
      }),
    );
    const message = [
      t("cart.whatsappIntro"),
      ...lines,
      t("cart.whatsappTotal", { total: formatPrice(order.total, i18n.language) }),
    ].join("\n");
    window.open(`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noreferrer");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("orderHistory.title")}</h1>
        {orders.length > 0 && (
          <button type="button" onClick={handleClear} className="text-sm font-medium text-red-600 hover:underline">
            {t("orderHistory.clearHistory")}
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-neutral-500">{t("orderHistory.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-label text-sm text-neutral-500">
                  {new Date(order.createdAt).toLocaleString(i18n.language === "ar" ? "ar" : "en")}
                </span>
                <span className="font-label text-sm font-semibold text-emerald-700">
                  {t("orderHistory.total")}: {formatPrice(order.total, i18n.language)}
                </span>
              </div>

              <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
                {order.items.map((item) => (
                  <li key={item.productId} className="font-label flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate text-neutral-700">
                      {item.name} <span className="text-neutral-400">× {item.quantity}</span>
                    </span>
                    <span className="shrink-0 text-neutral-900">{formatPrice(item.subtotal, i18n.language)}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleResend(order)}
                className="font-label flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <WhatsAppIcon className="h-4 w-4" />
                {t("orderHistory.resendWhatsapp")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
